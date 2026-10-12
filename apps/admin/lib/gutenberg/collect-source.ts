import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import {
  gutenbergCollectionJobsTable,
  gutenbergSourceBooksTable,
  type GutenbergCollectionCursor,
  type GutenbergImportFilters,
} from "@readup/db";
import { db } from "@/db/client";
import {
  fetchGutenbergBookText,
  fromPendingBook,
  isGutenbergRateLimitError,
  isUsableTextCandidate,
  listGutenbergBooks,
  type GutenbergBookSummary,
  GutenbergApiError,
} from "./client";

const PAGE_SIZE = 10;
const LEASE_MS = 5 * 60_000;

export async function createCollectionJob(args: {
  count: number;
  filters: GutenbergImportFilters;
  createdBy: string;
}) {
  const [job] = await db.insert(gutenbergCollectionJobsTable).values({
    requestedCount: args.count,
    filters: args.filters,
    cursor: { pending_books: [], exhausted: false },
    createdBy: args.createdBy,
  }).returning();
  if (!job) throw new Error("Could not create Gutenberg collection job.");
  return job;
}

export async function getCollectionJob(jobId: string) {
  const [job] = await db.select().from(gutenbergCollectionJobsTable)
    .where(eq(gutenbergCollectionJobsTable.id, jobId)).limit(1);
  return job ?? null;
}

export async function listSourceBooks() {
  const [counts, books] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int`, ready: sql<number>`count(*) filter (where text_status = 'ready')::int` })
      .from(gutenbergSourceBooksTable),
    db.select({
      gutenbergId: gutenbergSourceBooksTable.gutenbergId,
      title: gutenbergSourceBooksTable.title,
      authors: gutenbergSourceBooksTable.authors,
      bookshelves: gutenbergSourceBooksTable.bookshelves,
      textStatus: gutenbergSourceBooksTable.textStatus,
      textLength: gutenbergSourceBooksTable.textLength,
      textError: gutenbergSourceBooksTable.textError,
      updatedAt: gutenbergSourceBooksTable.updatedAt,
    }).from(gutenbergSourceBooksTable)
      .orderBy(desc(gutenbergSourceBooksTable.updatedAt)).limit(100),
  ]);
  return { total: counts[0]?.total ?? 0, ready: counts[0]?.ready ?? 0, books };
}

type Job = NonNullable<Awaited<ReturnType<typeof getCollectionJob>>>;

function publicJob(job: Job, busy = false, retryAfterMs?: number) {
  return {
    id: job.id,
    status: job.status,
    requested_count: job.requestedCount,
    saved_count: job.savedCount,
    skipped_count: job.skippedCount,
    failed_count: job.failedCount,
    last_error: job.lastError,
    busy,
    retry_after_ms: retryAfterMs,
  };
}

export async function getCollectionJobResponse(jobId: string) {
  const job = await getCollectionJob(jobId);
  return job ? publicJob(job) : null;
}

async function claimJob(jobId: string, token: string) {
  return db.transaction(async (tx) => {
    const [job] = await tx.select().from(gutenbergCollectionJobsTable)
      .where(eq(gutenbergCollectionJobsTable.id, jobId)).for("update").limit(1);
    if (!job) return { kind: "missing" } as const;
    if (job.status === "succeeded") return { kind: "terminal", job } as const;
    const cursor = job.cursor ?? {};
    const leaseUntil = Date.parse(cursor.lease?.expires_at ?? "");
    if (Number.isFinite(leaseUntil) && leaseUntil > Date.now()) {
      return { kind: "busy", job, retryAfterMs: Math.max(500, leaseUntil - Date.now()) } as const;
    }
    const rateUntil = Date.parse(cursor.rate_limited_until ?? "");
    if (Number.isFinite(rateUntil) && rateUntil > Date.now()) {
      return { kind: "busy", job, retryAfterMs: Math.max(500, rateUntil - Date.now()) } as const;
    }
    const [claimed] = await tx.update(gutenbergCollectionJobsTable).set({
      status: "running",
      lastError: null,
      cursor: {
        ...cursor,
        rate_limit_count: job.status === "failed" ? 0 : cursor.rate_limit_count,
        lease: { token, expires_at: new Date(Date.now() + LEASE_MS).toISOString() },
      },
      updatedAt: new Date(),
    }).where(eq(gutenbergCollectionJobsTable.id, jobId)).returning();
    return { kind: "claimed", job: claimed! } as const;
  });
}

async function releaseJob(
  job: Job,
  token: string,
  patch: Partial<Pick<Job, "status" | "savedCount" | "skippedCount" | "failedCount" | "lastError">>,
  cursor: GutenbergCollectionCursor,
) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(gutenbergCollectionJobsTable)
      .where(eq(gutenbergCollectionJobsTable.id, job.id)).for("update").limit(1);
    if (!current || current.cursor?.lease?.token !== token) return current ?? job;
    const nextCursor = { ...cursor };
    delete nextCursor.lease;
    const [updated] = await tx.update(gutenbergCollectionJobsTable).set({
      ...patch,
      cursor: nextCursor,
      updatedAt: new Date(),
    }).where(eq(gutenbergCollectionJobsTable.id, job.id)).returning();
    return updated!;
  });
}

function sourceValues(book: GutenbergBookSummary) {
  return {
    gutenbergId: book.id,
    title: book.title,
    authors: book.authors,
    bookshelves: book.bookshelves,
    subjects: book.subjects,
    languages: book.languages,
    mediaType: book.media_type,
    downloadCount: book.download_count,
    issued: book.issued,
    coverImageUrl: book.cover_image,
    gutenbergUrl: book.gutenberg_url,
    rawBook: book.raw,
    updatedAt: new Date(),
  };
}

export async function advanceCollectionJob(jobId: string) {
  const token = randomUUID();
  const claim = await claimJob(jobId, token);
  if (claim.kind === "missing") return null;
  if (claim.kind === "terminal") return publicJob(claim.job);
  if (claim.kind === "busy") return publicJob(claim.job, true, claim.retryAfterMs);

  const job = claim.job;
  const cursor: GutenbergCollectionCursor = { ...(job.cursor ?? {}) };
  delete cursor.rate_limited_until;
  try {
    if (job.savedCount >= job.requestedCount) {
      return publicJob(await releaseJob(job, token, { status: "succeeded" }, cursor));
    }

    let pending = cursor.pending_books ?? [];
    if (pending.length === 0 && !cursor.exhausted) {
      const page = await listGutenbergBooks({
        filters: job.filters,
        pageSize: PAGE_SIZE,
        nextUrl: cursor.next_url,
      });
      pending = page.results.map((book) => book.raw);
      cursor.next_url = page.next;
      cursor.exhausted = !page.next;
      cursor.rate_limit_count = 0;
    }

    if (pending.length === 0) {
      const message = job.savedCount < job.requestedCount
        ? `Catalog exhausted after saving ${job.savedCount} of ${job.requestedCount} requested books.`
        : null;
      return publicJob(await releaseJob(job, token, { status: "succeeded", lastError: message }, cursor));
    }

    const [raw, ...remaining] = pending;
    const book = fromPendingBook(raw!);
    if (!book || !isUsableTextCandidate(book)) {
      cursor.pending_books = remaining;
      const updated = await releaseJob(job, token, { skippedCount: job.skippedCount + 1 }, cursor);
      return publicJob(updated);
    }

    const [existing] = await db.select({ textStatus: gutenbergSourceBooksTable.textStatus })
      .from(gutenbergSourceBooksTable)
      .where(eq(gutenbergSourceBooksTable.gutenbergId, book.id)).limit(1);
    if (existing?.textStatus === "ready") {
      cursor.pending_books = remaining;
      const updated = await releaseJob(job, token, { skippedCount: job.skippedCount + 1 }, cursor);
      return publicJob(updated);
    }

    let textResult: Awaited<ReturnType<typeof fetchGutenbergBookText>>;
    try {
      textResult = await fetchGutenbergBookText(book.id, { allowSourceFallback: false });
      if (!textResult.text.trim()) throw new Error("The API returned no cleaned text.");
      cursor.rate_limit_count = 0;
    } catch (error) {
      if (isGutenbergRateLimitError(error)) throw error;
      if (error instanceof GutenbergApiError && (
        error.status === 401 || error.status === 403 || error.status >= 500 ||
        (error.status === 404 && error.message.includes("text API not found"))
      )) {
        throw error;
      }
      const message = error instanceof Error ? error.message.slice(0, 500) : "Text fetch failed.";
      await db.insert(gutenbergSourceBooksTable).values({
        ...sourceValues(book), textStatus: "failed", textError: message,
      }).onConflictDoUpdate({
        target: gutenbergSourceBooksTable.gutenbergId,
        set: { ...sourceValues(book), textStatus: "failed", textError: message },
      });
      cursor.pending_books = remaining;
      const updated = await releaseJob(job, token, { failedCount: job.failedCount + 1 }, cursor);
      return publicJob(updated);
    }

    const content = textResult.text;
    const hash = createHash("sha256").update(content).digest("hex");
    const values = {
      ...sourceValues(book),
      cleanedText: content,
      textStatus: "ready",
      textError: null,
      textSource: textResult.textSource,
      cleaningMode: textResult.cleaning_mode,
      textMetadata: textResult.rawMetadata,
      textLength: content.length,
      textSha256: hash,
      fetchedAt: new Date(),
    };
    await db.insert(gutenbergSourceBooksTable).values(values).onConflictDoUpdate({
      target: gutenbergSourceBooksTable.gutenbergId,
      set: values,
    });
    cursor.pending_books = remaining;
    const savedCount = job.savedCount + 1;
    const updated = await releaseJob(job, token, {
      savedCount,
      status: savedCount >= job.requestedCount ? "succeeded" : "running",
    }, cursor);
    return publicJob(updated);
  } catch (error) {
    if (isGutenbergRateLimitError(error)) {
      const delay = error instanceof GutenbergApiError ? error.retryAfterMs ?? 30_000 : 30_000;
      const attempts = (cursor.rate_limit_count ?? 0) + 1;
      cursor.rate_limit_count = attempts;
      if (attempts >= 2) {
        const updated = await releaseJob(job, token, {
          status: "failed",
          lastError: "Gutenberg API is still rate limited. Resume this job after the limit clears.",
        }, cursor);
        return publicJob(updated);
      }
      cursor.rate_limited_until = new Date(Date.now() + delay).toISOString();
      const updated = await releaseJob(job, token, {}, cursor);
      return publicJob(updated, true, delay);
    }
    const message = error instanceof Error ? error.message : "Collection failed.";
    const updated = await releaseJob(job, token, { status: "failed", lastError: message.slice(0, 500) }, cursor);
    return publicJob(updated);
  }
}
