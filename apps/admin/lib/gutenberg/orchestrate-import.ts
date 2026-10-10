import "server-only";

import { randomUUID } from "node:crypto";
import type {
  GutenbergImportCursor,
  GutenbergImportItemStatus,
  GutenbergImportProgress,
  GutenbergPendingBook,
} from "@readup/db";
import {
  createBookWork,
  createGenerationJob,
  findWorkByGutenbergId,
  getGenerationJob,
  updateWorkCover,
} from "@/lib/book-relational";
import { advanceBookGenerationJob } from "@/lib/book-generation/orchestrate";
import type { BookGenerationJobPayload } from "@/lib/book-generation/types";
import { uploadWorkCover } from "@/lib/cover-storage";
import {
  downloadCoverBytes,
  fetchGutenbergBookText,
  formatAuthorName,
  fromPendingBook,
  isGutenbergRateLimitError,
  isUsableTextCandidate,
  listGutenbergBooks,
  toPendingBook,
  type GutenbergBookSummary,
  GutenbergApiError,
} from "./client";
import {
  claimGutenbergImportLease,
  findActiveImportItem,
  getGutenbergImportItem,
  getGutenbergImportJob,
  insertGutenbergImportItem,
  isUniqueViolation,
  listGutenbergImportItems,
  recountImportProgress,
  releaseGutenbergImportLease,
  updateGutenbergImportItem,
} from "./relational";
import { prepareGutenbergSourceText } from "./source-prep";

const STEP_LEASE_MS = 5.5 * 60 * 1000;
const PAGE_SIZE = 10;
const DEFAULT_RATE_LIMIT_MS = 15_000;

const FIXED_WORKFLOW = {
  reading_level: "advanced" as const,
  length: "long" as const,
  languages: ["en", "ru"],
  include_quiz: true,
};

export type AdvanceGutenbergImportResult =
  | { kind: "advanced" | "terminal" }
  | { kind: "busy"; retryAfterMs: number }
  | { kind: "not_found" };

function mapGenerationProgressToItemStatus(
  step: string | undefined,
  language: string | undefined,
): GutenbergImportItemStatus {
  if (!step) return "saving";
  if (step === "generating_english" || step === "saving_english") {
    return "generating_english";
  }
  if (step === "translating") {
    return "generating_russian";
  }
  if (step === "generating_tts") {
    if (language === "ru") return "generating_russian_tts";
    if (language === "en") return "generating_english_tts";
    return "generating_english_tts";
  }
  if (step === "completed") return "completed";
  if (step === "error") return "failed";
  return "saving";
}

async function finishImportJob(
  jobId: string,
  leaseToken: string,
  progress: GutenbergImportProgress,
  message?: string,
) {
  await releaseGutenbergImportLease({
    jobId,
    leaseToken,
    status: "succeeded",
    error: message ?? null,
    progress,
    cursorPatch: { active_item_id: null },
  });
}

function rateLimitRetryAfterMs(cursor: GutenbergImportCursor, now = Date.now()): number | null {
  if (!cursor.rate_limited_until) return null;
  const until = Date.parse(cursor.rate_limited_until);
  if (!Number.isFinite(until) || until <= now) return null;
  return Math.max(500, until - now);
}

function pendingFromCursor(cursor: GutenbergImportCursor): GutenbergBookSummary[] {
  const raw = cursor.pending_books ?? [];
  return raw
    .map((b) => fromPendingBook(b as unknown as Record<string, unknown>))
    .filter((b): b is GutenbergBookSummary => b != null);
}

function storePending(books: GutenbergBookSummary[]): GutenbergPendingBook[] {
  return books.map((b) => toPendingBook(b));
}

/**
 * At most one RapidAPI list page per advance. Prefers cached pending_books.
 */
async function ensureCandidates(args: {
  filters: Record<string, unknown>;
  cursor: GutenbergImportCursor;
  knownIds: Set<number>;
}): Promise<{
  cursor: GutenbergImportCursor;
  nextBook: GutenbergBookSummary | null;
  exhausted: boolean;
}> {
  const cursor = { ...args.cursor };
  let pending = pendingFromCursor(cursor).filter((b) => !args.knownIds.has(b.id));

  while (pending.length > 0) {
    const book = pending[0]!;
    pending = pending.slice(1);
    if (!isUsableTextCandidate(book)) continue;
    if (args.knownIds.has(book.id)) continue;
    const existing = await findWorkByGutenbergId(book.id);
    if (existing) {
      args.knownIds.add(book.id);
      continue;
    }
    cursor.pending_books = storePending(pending);
    cursor.candidate_ids = [
      ...new Set([...(cursor.candidate_ids ?? []), book.id, ...pending.map((p) => p.id)]),
    ];
    return { cursor, nextBook: book, exhausted: false };
  }

  if (cursor.exhausted) {
    cursor.pending_books = [];
    return { cursor, nextBook: null, exhausted: true };
  }

  const page = cursor.page ?? 1;
  const nextUrl = cursor.next_url ?? null;

  const list = await listGutenbergBooks({
    filters: args.filters as {
      genre?: string;
      author?: string;
      year?: number;
    },
    page,
    pageSize: PAGE_SIZE,
    nextUrl,
  });

  const fresh: GutenbergBookSummary[] = [];
  for (const book of list.results) {
    if (!isUsableTextCandidate(book)) continue;
    if (args.knownIds.has(book.id)) continue;
    const existing = await findWorkByGutenbergId(book.id);
    if (existing) {
      args.knownIds.add(book.id);
      continue;
    }
    args.knownIds.add(book.id);
    fresh.push(book);
  }

  cursor.next_url = list.next;
  if (list.next) {
    cursor.page = page + 1;
  } else if (list.results.length > 0) {
    cursor.page = page + 1;
  } else {
    cursor.exhausted = true;
  }
  if (!list.next && list.results.length < PAGE_SIZE) {
    cursor.exhausted = true;
  }

  if (fresh.length === 0) {
    cursor.pending_books = [];
    return {
      cursor,
      nextBook: null,
      exhausted: Boolean(cursor.exhausted),
    };
  }

  const [nextBook, ...rest] = fresh;
  cursor.pending_books = storePending(rest);
  cursor.candidate_ids = [
    ...new Set([...(cursor.candidate_ids ?? []), ...fresh.map((b) => b.id)]),
  ];
  return { cursor, nextBook: nextBook!, exhausted: false };
}

export async function advanceGutenbergImportJob(
  jobId: string,
): Promise<AdvanceGutenbergImportResult> {
  const leaseToken = randomUUID();
  const claim = await claimGutenbergImportLease({
    jobId,
    lease: {
      token: leaseToken,
      expires_at: new Date(Date.now() + STEP_LEASE_MS).toISOString(),
    },
  });

  if (claim.kind === "not_found") return { kind: "not_found" };
  if (claim.kind === "busy") {
    return { kind: "busy", retryAfterMs: claim.retryAfterMs };
  }
  if (claim.kind === "terminal") return { kind: "terminal" };

  const job = claim.job;
  let cursor = { ...(job.cursor ?? {}) } as GutenbergImportCursor;

  try {
    const rateWait = rateLimitRetryAfterMs(cursor);
    if (rateWait != null) {
      await releaseGutenbergImportLease({
        jobId,
        leaseToken,
        status: "running",
        cursorPatch: cursor,
      });
      return { kind: "busy", retryAfterMs: rateWait };
    }

    let progress = await recountImportProgress(jobId, job.requestedCount);

    if (progress.imported >= job.requestedCount) {
      progress = await recountImportProgress(jobId, job.requestedCount);
      progress.processing = 0;
      await finishImportJob(jobId, leaseToken, progress);
      console.info("[gutenberg_import] job completed", { jobId, progress });
      return { kind: "advanced" };
    }

    let activeItem: Awaited<ReturnType<typeof findActiveImportItem>> = null;
    if (cursor.active_item_id) {
      const byId = await getGutenbergImportItem(cursor.active_item_id);
      if (
        byId &&
        byId.status !== "completed" &&
        byId.status !== "skipped" &&
        byId.status !== "failed"
      ) {
        activeItem = byId;
      }
    }
    if (!activeItem) {
      activeItem = await findActiveImportItem(jobId);
    }

    if (activeItem?.generationJobId) {
      const nested = await advanceBookGenerationJob(activeItem.generationJobId);
      if (nested.kind === "busy") {
        await releaseGutenbergImportLease({
          jobId,
          leaseToken,
          status: "running",
          progress,
          cursorPatch: { ...cursor, active_item_id: activeItem.id },
        });
        return { kind: "busy", retryAfterMs: nested.retryAfterMs };
      }

      const genJob = await getGenerationJob(activeItem.generationJobId);
      if (!genJob) {
        await updateGutenbergImportItem(activeItem.id, {
          status: "failed",
          error: "Nested generation job disappeared.",
        });
        progress = await recountImportProgress(jobId, job.requestedCount);
        await releaseGutenbergImportLease({
          jobId,
          leaseToken,
          status: "running",
          progress,
          cursorPatch: { ...cursor, active_item_id: null },
        });
        return { kind: "advanced" };
      }

      const payload = (genJob.payload ?? {}) as BookGenerationJobPayload;
      const step = payload.progress?.step;
      const language = payload.progress?.language;

      if (genJob.status === "succeeded") {
        await updateGutenbergImportItem(activeItem.id, {
          status: "completed",
          error: null,
        });
        progress = await recountImportProgress(jobId, job.requestedCount);
        console.info("[gutenberg_import] book completed", {
          jobId,
          gutenbergId: activeItem.gutenbergId,
          workId: activeItem.workId,
        });
        await releaseGutenbergImportLease({
          jobId,
          leaseToken,
          status: "running",
          progress,
          cursorPatch: { ...cursor, active_item_id: null },
        });
        return { kind: "advanced" };
      }

      if (genJob.status === "failed") {
        await updateGutenbergImportItem(activeItem.id, {
          status: "failed",
          error: genJob.lastError ?? "Book generation failed.",
        });
        progress = await recountImportProgress(jobId, job.requestedCount);
        console.error("[gutenberg_import] nested generation failed", {
          jobId,
          gutenbergId: activeItem.gutenbergId,
          error: genJob.lastError,
        });
        await releaseGutenbergImportLease({
          jobId,
          leaseToken,
          status: "running",
          progress,
          cursorPatch: { ...cursor, active_item_id: null },
        });
        return { kind: "advanced" };
      }

      const itemStatus = mapGenerationProgressToItemStatus(step, language);
      await updateGutenbergImportItem(activeItem.id, { status: itemStatus });
      progress = await recountImportProgress(jobId, job.requestedCount);
      await releaseGutenbergImportLease({
        jobId,
        leaseToken,
        status: "running",
        progress,
        cursorPatch: { ...cursor, active_item_id: activeItem.id },
      });
      return { kind: "advanced" };
    }

    if (activeItem && !activeItem.generationJobId) {
      const rateLimited = await processWaitingItem({
        jobId,
        leaseToken,
        itemId: activeItem.id,
        requestedCount: job.requestedCount,
        cursor,
      });
      if (rateLimited) {
        return {
          kind: "busy",
          retryAfterMs: rateLimited.retryAfterMs,
        };
      }
      return { kind: "advanced" };
    }

    const stillNeeded = job.requestedCount - progress.imported - progress.processing;
    if (stillNeeded <= 0) {
      progress = await recountImportProgress(jobId, job.requestedCount);
      if (progress.processing > 0) {
        await releaseGutenbergImportLease({
          jobId,
          leaseToken,
          status: "running",
          progress,
          cursorPatch: cursor,
        });
        return { kind: "advanced" };
      }
      await finishImportJob(
        jobId,
        leaseToken,
        progress,
        progress.imported < job.requestedCount
          ? `Finished with ${progress.imported}/${job.requestedCount} imported (${progress.skipped} skipped, ${progress.failed} failed).`
          : undefined,
      );
      return { kind: "advanced" };
    }

    const existingItems = await listGutenbergImportItems(jobId);
    const knownIds = new Set(existingItems.map((i) => i.gutenbergId));

    let nextBook: GutenbergBookSummary | null = null;
    let exhausted = false;
    try {
      const ensured = await ensureCandidates({
        filters: job.filters ?? {},
        cursor,
        knownIds,
      });
      cursor = ensured.cursor;
      nextBook = ensured.nextBook;
      exhausted = ensured.exhausted;
    } catch (error) {
      if (isGutenbergRateLimitError(error)) {
        const delay =
          error instanceof GutenbergApiError && error.retryAfterMs
            ? error.retryAfterMs
            : DEFAULT_RATE_LIMIT_MS;
        cursor.rate_limited_until = new Date(Date.now() + delay).toISOString();
        await releaseGutenbergImportLease({
          jobId,
          leaseToken,
          status: "running",
          progress,
          error: null,
          cursorPatch: cursor,
        });
        console.warn("[gutenberg_import] rate limited on list; soft busy", {
          jobId,
          delayMs: delay,
        });
        return { kind: "busy", retryAfterMs: delay };
      }
      throw error;
    }

    // Clear rate limit marker after a successful list.
    cursor.rate_limited_until = null;

    if (!nextBook) {
      progress = await recountImportProgress(jobId, job.requestedCount);
      if (!exhausted && (cursor.page ?? 1) > 1) {
        // Empty page but not exhausted — try again next tick with updated cursor.
        await releaseGutenbergImportLease({
          jobId,
          leaseToken,
          status: "running",
          progress,
          cursorPatch: cursor,
        });
        return { kind: "advanced" };
      }
      console.warn("[gutenberg_import] no more candidates", { jobId, progress });
      await finishImportJob(
        jobId,
        leaseToken,
        progress,
        `No more matching Gutenberg books. Imported ${progress.imported}/${job.requestedCount}.`,
      );
      return { kind: "advanced" };
    }

    const existingWork = await findWorkByGutenbergId(nextBook.id);
    if (existingWork) {
      await insertGutenbergImportItem({
        jobId,
        gutenbergId: nextBook.id,
        title: nextBook.title,
        author: formatAuthorName(nextBook.authors),
        status: "skipped",
        metadata: {
          subjects: nextBook.subjects,
          language: nextBook.languages[0],
          gutenberg_url: nextBook.gutenberg_url ?? undefined,
          issued: nextBook.issued,
          cover_image_url: nextBook.cover_image,
          download_count: nextBook.download_count,
        },
      });
      progress = await recountImportProgress(jobId, job.requestedCount);
      await releaseGutenbergImportLease({
        jobId,
        leaseToken,
        status: "running",
        progress,
        cursorPatch: cursor,
      });
      return { kind: "advanced" };
    }

    const item = await insertGutenbergImportItem({
      jobId,
      gutenbergId: nextBook.id,
      title: nextBook.title,
      author: formatAuthorName(nextBook.authors),
      status: "waiting",
      metadata: {
        subjects: nextBook.subjects,
        language: nextBook.languages[0],
        gutenberg_url: nextBook.gutenberg_url ?? undefined,
        issued: nextBook.issued,
        cover_image_url: nextBook.cover_image,
        download_count: nextBook.download_count,
      },
    });

    console.info("[gutenberg_import] selected book", {
      jobId,
      gutenbergId: nextBook.id,
      title: nextBook.title,
    });

    cursor.active_item_id = item.id;
    progress = await recountImportProgress(jobId, job.requestedCount);
    await releaseGutenbergImportLease({
      jobId,
      leaseToken,
      status: "running",
      progress,
      cursorPatch: cursor,
    });

    // Fetch text on the next advance (keeps this step to one RapidAPI call).
    return { kind: "advanced" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gutenberg import failed.";
    console.error("[gutenberg_import] step failed", { jobId, error: message });

    if (isGutenbergRateLimitError(error)) {
      const delay =
        error instanceof GutenbergApiError && error.retryAfterMs
          ? error.retryAfterMs
          : DEFAULT_RATE_LIMIT_MS;
      cursor.rate_limited_until = new Date(Date.now() + delay).toISOString();
      await releaseGutenbergImportLease({
        jobId,
        leaseToken,
        status: "running",
        error: null,
        cursorPatch: cursor,
      });
      return { kind: "busy", retryAfterMs: delay };
    }

    await releaseGutenbergImportLease({
      jobId,
      leaseToken,
      status: "running",
      error: message,
      cursorPatch: cursor,
    });
    return { kind: "advanced" };
  }
}

async function processWaitingItem(args: {
  jobId: string;
  leaseToken: string;
  itemId: string;
  requestedCount: number;
  cursor: GutenbergImportCursor;
}): Promise<{ retryAfterMs: number } | null> {
  const release = async (patch: {
    progress?: GutenbergImportProgress;
    cursorPatch?: Partial<GutenbergImportCursor>;
    error?: string | null;
  }) => {
    await releaseGutenbergImportLease({
      jobId: args.jobId,
      leaseToken: args.leaseToken,
      status: "running",
      progress: patch.progress,
      cursorPatch: { ...args.cursor, ...patch.cursorPatch },
      error: patch.error,
    });
  };

  const item = await getGutenbergImportItem(args.itemId);
  if (
    !item ||
    item.generationJobId ||
    item.status === "completed" ||
    item.status === "skipped" ||
    item.status === "failed"
  ) {
    const progress = await recountImportProgress(args.jobId, args.requestedCount);
    await release({
      progress,
      cursorPatch: { active_item_id: item?.generationJobId ? item.id : null },
    });
    return null;
  }

  try {
    await updateGutenbergImportItem(item.id, { status: "fetching", error: null });

    const existing = await findWorkByGutenbergId(item.gutenbergId);
    if (existing) {
      await updateGutenbergImportItem(item.id, {
        status: "skipped",
        workId: existing.id,
        error: "Already imported.",
      });
      const progress = await recountImportProgress(args.jobId, args.requestedCount);
      await release({
        progress,
        cursorPatch: { active_item_id: null, rate_limited_until: null },
      });
      console.info("[gutenberg_import] skipped duplicate", {
        jobId: args.jobId,
        gutenbergId: item.gutenbergId,
      });
      return null;
    }

    const textRes = await fetchGutenbergBookText(item.gutenbergId);
    if (!textRes.text?.trim()) {
      throw new Error("Book text unavailable from Gutenberg API.");
    }

    console.info("[gutenberg_import] full text ready", {
      gutenbergId: item.gutenbergId,
      chars: textRes.text.length,
      cleanedLength: textRes.metadata?.cleaned_length,
    });

    await updateGutenbergImportItem(item.id, { status: "fetched" });

    const source = await prepareGutenbergSourceText({
      title: item.title,
      author: item.author,
      text: textRes.text,
      gutenbergId: item.gutenbergId,
    });

    let work: { id: string };
    try {
      work = await createBookWork({ gutenbergId: item.gutenbergId });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const dup = await findWorkByGutenbergId(item.gutenbergId);
        await updateGutenbergImportItem(item.id, {
          status: "skipped",
          workId: dup?.id ?? null,
          error: "Already imported.",
        });
        const progress = await recountImportProgress(args.jobId, args.requestedCount);
        await release({ progress, cursorPatch: { active_item_id: null } });
        return null;
      }
      throw error;
    }

    const coverUrl = item.metadata?.cover_image_url;
    let coverPath: string | null = null;
    if (coverUrl) {
      const cover = await downloadCoverBytes(coverUrl);
      if (cover) {
        try {
          coverPath = await uploadWorkCover(work.id, cover);
          await updateWorkCover(work.id, coverPath);
        } catch (error) {
          console.warn("[gutenberg_import] cover upload failed", {
            gutenbergId: item.gutenbergId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    const gutenbergUrl =
      item.metadata?.gutenberg_url ??
      textRes.metadata?.source_url ??
      `https://www.gutenberg.org/ebooks/${item.gutenbergId}`;

    const payload: BookGenerationJobPayload = {
      workflow_settings: {
        topic: item.title.slice(0, 200),
        reading_level: FIXED_WORKFLOW.reading_level,
        length: FIXED_WORKFLOW.length,
        languages: FIXED_WORKFLOW.languages,
        include_quiz: FIXED_WORKFLOW.include_quiz,
      },
      source,
      cover_path: coverPath,
      gutenberg: { id: item.gutenbergId, url: gutenbergUrl },
      progress: { step: "queued", message: "Waiting to generate..." },
      heartbeat_at: new Date().toISOString(),
      result: null,
    };

    const genJob = await createGenerationJob({
      workId: work.id,
      type: "book_generation",
      payload: payload as unknown as Record<string, unknown>,
    });

    await updateGutenbergImportItem(item.id, {
      status: "generating_english",
      workId: work.id,
      generationJobId: genJob.id,
      error: null,
    });

    console.info("[gutenberg_import] generation job created", {
      jobId: args.jobId,
      gutenbergId: item.gutenbergId,
      workId: work.id,
      generationJobId: genJob.id,
    });

    const progress = await recountImportProgress(args.jobId, args.requestedCount);
    await release({
      progress,
      cursorPatch: {
        active_item_id: item.id,
        rate_limited_until: null,
      },
    });
    return null;
  } catch (error) {
    if (isGutenbergRateLimitError(error)) {
      const delay =
        error instanceof GutenbergApiError && error.retryAfterMs
          ? error.retryAfterMs
          : DEFAULT_RATE_LIMIT_MS;
      const until = new Date(Date.now() + delay).toISOString();
      await updateGutenbergImportItem(args.itemId, {
        status: "waiting",
        error: null,
      });
      await release({
        cursorPatch: {
          active_item_id: args.itemId,
          rate_limited_until: until,
        },
        error: null,
      });
      console.warn("[gutenberg_import] rate limited on text; soft busy", {
        jobId: args.jobId,
        itemId: args.itemId,
        delayMs: delay,
      });
      return { retryAfterMs: delay };
    }

    const message = error instanceof Error ? error.message : "Failed to process Gutenberg book.";
    console.error("[gutenberg_import] item failed", {
      jobId: args.jobId,
      itemId: args.itemId,
      error: message,
    });
    await updateGutenbergImportItem(args.itemId, {
      status: "failed",
      error: message,
    });
    const progress = await recountImportProgress(args.jobId, args.requestedCount);
    await release({
      progress,
      cursorPatch: { active_item_id: null },
      error: message,
    });
    return null;
  }
}

export async function getGutenbergImportSnapshot(jobId: string) {
  const job = await getGutenbergImportJob(jobId);
  if (!job) return null;
  const items = await listGutenbergImportItems(jobId);
  const progress = await recountImportProgress(jobId, job.requestedCount);
  return { job: { ...job, progress }, items };
}
