import "server-only";

import type { GutenbergImportFilters } from "@readup/db";

const DEFAULT_HOST = "project-gutenberg-free-books-api1.p.rapidapi.com";
/** RapidAPI basic plans are typically 1 request/second. */
const MIN_REQUEST_GAP_MS = 1100;
const RATE_LIMIT_BACKOFF_MS = [5_000, 15_000, 30_000] as const;
const MAX_RAPIDAPI_ATTEMPTS = 4;

/** Documented mounts: pagination `next` uses `/books`; some docs show `/api/books`. */
const PATH_PREFIXES = ["", "/api"] as const;
type PathPrefix = (typeof PATH_PREFIXES)[number];

const SUBSCRIPTION_HELP =
  "Subscribe to the RapidAPI product “Project Gutenberg - Free Books API” " +
  `(host ${DEFAULT_HOST}), set GUTENBERG_API_KEY / GUTENBERG_API_HOST in apps/admin/.env, ` +
  "and restart the admin server. Do not use project-gutenberg-books-api.p.rapidapi.com or " +
  "project-gutenberg-api.p.rapidapi.com (different products).";

export type GutenbergBookSummary = {
  id: number;
  title: string;
  authors: { id?: number; name: string }[];
  subjects: string[];
  bookshelves: string[];
  media_type: string | null;
  languages: string[];
  download_count: number;
  issued: string | null;
  cover_image: string | null;
  gutenberg_url: string | null;
  reading_ease_score?: string | null;
};

export type GutenbergBookListResponse = {
  next: string | null;
  previous: string | null;
  count?: number;
  results: GutenbergBookSummary[];
};

export type GutenbergBookTextResponse = {
  book_id: number;
  title: string;
  alternative_title?: string | null;
  cleaning_mode?: string;
  text: string;
  metadata?: {
    original_length?: number;
    cleaned_length?: number;
    source_format?: string;
    source_url?: string;
  };
};

export class GutenbergApiError extends Error {
  status: number;
  retryAfterMs?: number;
  constructor(message: string, status: number, retryAfterMs?: number) {
    super(message);
    this.name = "GutenbergApiError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

export function isGutenbergRateLimitError(error: unknown): boolean {
  return error instanceof GutenbergApiError && error.status === 429;
}

function getApiConfig(): { baseUrl: string; apiKey: string; host: string } {
  const apiKey = process.env.GUTENBERG_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GUTENBERG_API_KEY is not configured.");
  }
  const host = process.env.GUTENBERG_API_HOST?.trim() || DEFAULT_HOST;
  return {
    baseUrl: `https://${host}`,
    apiKey,
    host,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(header: string | null, attemptIndex: number): number {
  if (header) {
    const asSeconds = Number(header);
    if (Number.isFinite(asSeconds) && asSeconds >= 0) {
      return Math.min(Math.max(Math.ceil(asSeconds * 1000), 1000), 60_000);
    }
    const asDate = Date.parse(header);
    if (Number.isFinite(asDate)) {
      return Math.min(Math.max(asDate - Date.now(), 1000), 60_000);
    }
  }
  return RATE_LIMIT_BACKOFF_MS[Math.min(attemptIndex, RATE_LIMIT_BACKOFF_MS.length - 1)]!;
}

function isMissingRouteError(error: unknown): boolean {
  if (!(error instanceof GutenbergApiError)) return false;
  if (error.status !== 404) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("doesn't exist") ||
    msg.includes("does not exist") ||
    msg.includes("api doesn't exists") ||
    msg.includes("not found")
  );
}

/** Process-local RapidAPI gate: one in-flight call + minimum spacing. */
let rapidApiChain: Promise<void> = Promise.resolve();
let lastRapidApiStartedAt = 0;

/** Cached path prefix once a list route responds as a real endpoint. */
let resolvedPathPrefix: PathPrefix | null = null;
let pathResolvePromise: Promise<PathPrefix> | null = null;

async function withRapidApiGate<T>(fn: () => Promise<T>): Promise<T> {
  const run = rapidApiChain.then(async () => {
    const waitMs = Math.max(0, MIN_REQUEST_GAP_MS - (Date.now() - lastRapidApiStartedAt));
    if (waitMs > 0) await sleep(waitMs);
    lastRapidApiStartedAt = Date.now();
    return fn();
  });
  rapidApiChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function normalizeBook(raw: Record<string, unknown>): GutenbergBookSummary | null {
  const id = typeof raw.id === "number" ? raw.id : Number(raw.id);
  if (!Number.isFinite(id) || id <= 0) return null;

  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : `Gutenberg Book ${id}`;

  let authors: { id?: number; name: string }[] = [];
  if (Array.isArray(raw.authors)) {
    authors = raw.authors
      .map((a) => {
        if (!a || typeof a !== "object") return null;
        const name = (a as { name?: unknown }).name;
        if (typeof name !== "string" || !name.trim()) return null;
        const authorId = (a as { id?: unknown }).id;
        return {
          name: name.trim(),
          ...(typeof authorId === "number" ? { id: authorId } : {}),
        };
      })
      .filter((a): a is { id?: number; name: string } => a != null);
  } else if (typeof raw.author === "string" && raw.author.trim()) {
    authors = [{ name: raw.author.trim() }];
  }

  const subjects = Array.isArray(raw.subjects)
    ? raw.subjects.filter((s): s is string => typeof s === "string")
    : [];
  const bookshelves = Array.isArray(raw.bookshelves)
    ? raw.bookshelves.filter((s): s is string => typeof s === "string")
    : [];

  let languages: string[] = [];
  if (Array.isArray(raw.languages)) {
    languages = raw.languages.filter((l): l is string => typeof l === "string");
  } else if (typeof raw.language === "string") {
    languages = [raw.language];
  }

  return {
    id,
    title,
    authors,
    subjects,
    bookshelves,
    media_type: typeof raw.media_type === "string" ? raw.media_type : null,
    languages,
    download_count:
      typeof raw.download_count === "number" ? raw.download_count : 0,
    issued: typeof raw.issued === "string" ? raw.issued : null,
    cover_image:
      typeof raw.cover_image === "string"
        ? raw.cover_image
        : typeof raw.cover_image_url === "string"
          ? raw.cover_image_url
          : null,
    gutenberg_url:
      typeof raw.gutenberg_url === "string"
        ? raw.gutenberg_url
        : `https://www.gutenberg.org/ebooks/${id}`,
    reading_ease_score:
      typeof raw.reading_ease_score === "string" ||
      typeof raw.reading_ease_score === "number"
        ? String(raw.reading_ease_score)
        : null,
  };
}

/**
 * Single RapidAPI GET. Does not retry missing-route 404s (used by path discovery).
 * Retries only 429 with backoff.
 */
async function gutenbergFetchJson(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
): Promise<Record<string, unknown>> {
  const { baseUrl, apiKey, host } = getApiConfig();
  const url = new URL(path.startsWith("http") ? path : `${baseUrl}${path}`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RAPIDAPI_ATTEMPTS; attempt += 1) {
    try {
      const data = await withRapidApiGate(async () => {
        const res = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": apiKey,
            "X-RapidAPI-Host": host,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        if (res.status === 429) {
          const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"), attempt);
          const body = await res.text().catch(() => "");
          throw new GutenbergApiError(
            `Gutenberg API 429: ${body.slice(0, 200) || "Too many requests"}`,
            429,
            retryAfterMs,
          );
        }

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new GutenbergApiError(
            `Gutenberg API ${res.status}: ${body.slice(0, 200) || res.statusText}`,
            res.status,
          );
        }

        return (await res.json()) as Record<string, unknown>;
      });
      return data;
    } catch (error) {
      lastError = error;
      if (error instanceof GutenbergApiError && error.status === 429) {
        const delay = error.retryAfterMs ?? parseRetryAfterMs(null, attempt);
        if (attempt + 1 >= MAX_RAPIDAPI_ATTEMPTS) break;
        console.warn("[gutenberg] rate limited; backing off", {
          path: url.pathname,
          attempt: attempt + 1,
          delayMs: delay,
        });
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new GutenbergApiError("Gutenberg API rate limited", 429, 30_000);
}

/**
 * Probe `/books` then `/api/books` once. Cache the prefix that looks like a real route.
 * A 429/400 on a path means the route exists — cache it and rethrow.
 */
async function resolvePathPrefix(): Promise<PathPrefix> {
  if (resolvedPathPrefix != null) return resolvedPathPrefix;
  if (pathResolvePromise) return pathResolvePromise;

  pathResolvePromise = (async () => {
    const probeParams = { page: 1, page_size: 1 };
    let sawMissingRoute = false;

    for (const prefix of PATH_PREFIXES) {
      const path = `${prefix}/books`;
      try {
        await gutenbergFetchJson(path, probeParams);
        resolvedPathPrefix = prefix;
        console.info("[gutenberg] resolved API path prefix", {
          prefix: prefix || "(root)",
          listPath: path,
        });
        return prefix;
      } catch (error) {
        if (isMissingRouteError(error)) {
          sawMissingRoute = true;
          console.warn("[gutenberg] list path missing; trying next", { path });
          continue;
        }
        // Route exists but failed for another reason (rate limit, validation, etc.).
        resolvedPathPrefix = prefix;
        console.info("[gutenberg] resolved API path prefix (non-404 response)", {
          prefix: prefix || "(root)",
          listPath: path,
          status: error instanceof GutenbergApiError ? error.status : undefined,
        });
        throw error;
      }
    }

    resolvedPathPrefix = null;
    pathResolvePromise = null;
    throw new GutenbergApiError(
      sawMissingRoute
        ? `Gutenberg Books API route not found on this RapidAPI host. ${SUBSCRIPTION_HELP}`
        : `Gutenberg Books API is unavailable. ${SUBSCRIPTION_HELP}`,
      404,
    );
  })();

  try {
    return await pathResolvePromise;
  } catch (error) {
    // Allow a later retry after permanent failure (e.g. user fixes subscription).
    if (resolvedPathPrefix == null) {
      pathResolvePromise = null;
    }
    throw error;
  }
}

async function booksPath(suffix = ""): Promise<string> {
  const prefix = await resolvePathPrefix();
  return `${prefix}/books${suffix}`;
}

export function formatAuthorName(authors: { name: string }[]): string {
  if (authors.length === 0) return "Unknown";
  return authors
    .map((a) => {
      const parts = a.name.split(",").map((p) => p.trim());
      if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
      return a.name;
    })
    .join(", ");
}

export function isUsableTextCandidate(book: GutenbergBookSummary): boolean {
  const media = (book.media_type ?? "").toLowerCase();
  if (media && media !== "text") return false;
  if (book.languages.length > 0 && !book.languages.some((l) => l.toLowerCase().startsWith("en"))) {
    return false;
  }
  return true;
}

/** Serialize a book summary for cursor.pending_books (lean). */
export function toPendingBook(book: GutenbergBookSummary): {
  id: number;
  title: string;
  authors: { id?: number; name: string }[];
  subjects: string[];
  bookshelves: string[];
  media_type: string | null;
  languages: string[];
  download_count: number;
  issued: string | null;
  cover_image: string | null;
  gutenberg_url: string | null;
} {
  return {
    id: book.id,
    title: book.title,
    authors: book.authors,
    subjects: book.subjects,
    bookshelves: book.bookshelves,
    media_type: book.media_type,
    languages: book.languages,
    download_count: book.download_count,
    issued: book.issued,
    cover_image: book.cover_image,
    gutenberg_url: book.gutenberg_url,
  };
}

export function fromPendingBook(raw: Record<string, unknown>): GutenbergBookSummary | null {
  return normalizeBook(raw);
}

/**
 * Documented list params: q, page, page_size.
 * Author/genre fold into q; year uses author_year_* when provided.
 */
function buildListQuery(
  filters: GutenbergImportFilters,
  page: number,
  pageSize: number,
  options: { includeYearFilters: boolean } = { includeYearFilters: true },
) {
  const params: Record<string, string | number | undefined> = {
    page,
    page_size: pageSize,
  };

  const qParts: string[] = [];
  if (filters.author?.trim()) qParts.push(filters.author.trim());
  if (filters.genre?.trim()) qParts.push(filters.genre.trim());
  if (qParts.length > 0) {
    params.q = qParts.join(" ");
  }

  if (options.includeYearFilters && filters.year != null && Number.isFinite(filters.year)) {
    params.author_year_start = filters.year;
    params.author_year_end = filters.year;
  }

  return params;
}

function parseBookList(data: Record<string, unknown>): GutenbergBookListResponse {
  const resultsRaw = Array.isArray(data.results) ? data.results : [];
  const results = resultsRaw
    .map((r) =>
      r && typeof r === "object" ? normalizeBook(r as Record<string, unknown>) : null,
    )
    .filter((b): b is GutenbergBookSummary => b != null);

  return {
    next: typeof data.next === "string" ? data.next : null,
    previous: typeof data.previous === "string" ? data.previous : null,
    count: typeof data.count === "number" ? data.count : undefined,
    results,
  };
}

/**
 * List books from the Project Gutenberg Books RapidAPI.
 */
export async function listGutenbergBooks(args: {
  filters: GutenbergImportFilters;
  page?: number;
  pageSize?: number;
  nextUrl?: string | null;
}): Promise<GutenbergBookListResponse> {
  const page = args.page ?? 1;
  const pageSize = Math.min(Math.max(args.pageSize ?? 10, 1), 32);

  console.info("[gutenberg] list books", {
    page,
    pageSize,
    filters: args.filters,
    hasNextUrl: Boolean(args.nextUrl),
    pathPrefix: resolvedPathPrefix ?? "(resolving)",
  });

  if (args.nextUrl) {
    // Pagination URLs from the API are already absolute on the correct host/path.
    const data = await gutenbergFetchJson(args.nextUrl);
    return parseBookList(data);
  }

  const path = await booksPath();
  const fullParams = buildListQuery(args.filters, page, pageSize, {
    includeYearFilters: true,
  });

  try {
    const data = await gutenbergFetchJson(path, fullParams);
    return parseBookList(data);
  } catch (error) {
    // If year filters are rejected, retry with documented q/page/page_size only.
    const hasYear = args.filters.year != null;
    if (
      hasYear &&
      error instanceof GutenbergApiError &&
      (error.status === 400 || error.status === 422)
    ) {
      console.warn("[gutenberg] year filters rejected; retrying without them", {
        year: args.filters.year,
      });
      const simple = buildListQuery(args.filters, page, pageSize, {
        includeYearFilters: false,
      });
      const data = await gutenbergFetchJson(path, simple);
      return parseBookList(data);
    }
    if (isMissingRouteError(error)) {
      // Cached prefix went stale — clear and surface subscription guidance.
      resolvedPathPrefix = null;
      pathResolvePromise = null;
      throw new GutenbergApiError(
        `Gutenberg Books API route disappeared (${path}). ${SUBSCRIPTION_HELP}`,
        404,
      );
    }
    throw error;
  }
}

function textLooksIncomplete(
  text: string,
  metadata?: GutenbergBookTextResponse["metadata"],
): boolean {
  if (!text.trim()) return true;
  const expected =
    typeof metadata?.cleaned_length === "number"
      ? metadata.cleaned_length
      : typeof metadata?.original_length === "number"
        ? metadata.original_length
        : null;
  if (expected == null || expected <= 0) return false;
  return text.length < expected * 0.5 && text.length < 50_000;
}

async function fetchPlainTextFromUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "text/plain, */*" },
  });
  if (!res.ok) {
    throw new Error(`Failed to download source text (${res.status}).`);
  }
  const text = await res.text();
  return text.replace(/\r\n?/g, "\n").trim();
}

/**
 * Fetch full cleaned book text via Gutenberg Books API.
 * Falls back to metadata.source_url only when the API body is empty/truncated.
 */
export async function fetchGutenbergBookText(
  gutenbergId: number,
): Promise<GutenbergBookTextResponse> {
  console.info("[gutenberg] fetch book text", { gutenbergId });

  const path = await booksPath(`/${gutenbergId}/text`);
  let data: Record<string, unknown>;
  try {
    data = await gutenbergFetchJson(path, { cleaning_mode: "simple" });
  } catch (error) {
    if (isMissingRouteError(error) && resolvedPathPrefix != null) {
      // Text route may live under the other prefix; probe once without wiping list cache first.
      const other: PathPrefix = resolvedPathPrefix === "/api" ? "" : "/api";
      const altPath = `${other}/books/${gutenbergId}/text`;
      console.warn("[gutenberg] text path missing; trying alternate prefix", {
        path,
        altPath,
      });
      try {
        data = await gutenbergFetchJson(altPath, { cleaning_mode: "simple" });
        resolvedPathPrefix = other;
      } catch (altError) {
        if (isMissingRouteError(altError)) {
          throw new GutenbergApiError(
            `Gutenberg Books text API not found. ${SUBSCRIPTION_HELP}`,
            404,
          );
        }
        throw altError;
      }
    } else if (isMissingRouteError(error)) {
      throw new GutenbergApiError(
        `Gutenberg Books text API not found. ${SUBSCRIPTION_HELP}`,
        404,
      );
    } else {
      throw error;
    }
  }

  const metadata =
    data.metadata && typeof data.metadata === "object"
      ? (data.metadata as GutenbergBookTextResponse["metadata"])
      : undefined;

  let text = typeof data.text === "string" ? data.text : "";
  const bookId =
    typeof data.book_id === "number"
      ? data.book_id
      : typeof data.id === "number"
        ? data.id
        : gutenbergId;
  const title =
    typeof data.title === "string" ? data.title : `Gutenberg Book ${gutenbergId}`;

  console.info("[gutenberg] text response", {
    gutenbergId,
    textLength: text.length,
    cleanedLength: metadata?.cleaned_length,
    originalLength: metadata?.original_length,
  });

  if (textLooksIncomplete(text, metadata)) {
    const sourceUrl =
      (typeof metadata?.source_url === "string" && metadata.source_url) ||
      `https://www.gutenberg.org/files/${gutenbergId}/${gutenbergId}-0.txt`;
    console.info("[gutenberg] text incomplete; falling back to source_url", {
      gutenbergId,
      sourceUrl,
      apiTextLength: text.length,
    });
    try {
      const fallback = await fetchPlainTextFromUrl(sourceUrl);
      if (fallback.length > text.length) {
        text = fallback;
      }
    } catch (error) {
      console.warn("[gutenberg] source_url fallback failed", {
        gutenbergId,
        error: error instanceof Error ? error.message : String(error),
      });
      if (!text.trim()) throw error;
    }
  }

  return {
    book_id: bookId,
    title,
    alternative_title:
      typeof data.alternative_title === "string" ? data.alternative_title : null,
    cleaning_mode:
      typeof data.cleaning_mode === "string" ? data.cleaning_mode : "simple",
    text,
    metadata,
  };
}

export async function downloadCoverBytes(
  coverUrl: string,
): Promise<{ buffer: Buffer; mime: string; extension: string } | null> {
  try {
    const res = await fetch(coverUrl, { cache: "no-store" });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100 || buffer.length > 8 * 1024 * 1024) return null;

    let mime = contentType.split(";")[0]?.trim() || "image/jpeg";
    let extension = "jpg";
    if (mime.includes("png")) {
      mime = "image/png";
      extension = "png";
    } else if (mime.includes("webp")) {
      mime = "image/webp";
      extension = "webp";
    } else if (mime.includes("gif")) {
      mime = "image/gif";
      extension = "gif";
    } else {
      mime = "image/jpeg";
      extension = "jpg";
    }

    return { buffer, mime, extension };
  } catch (error) {
    console.warn("[gutenberg] cover download failed", {
      coverUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
