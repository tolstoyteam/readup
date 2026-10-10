import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import {
  gutenbergImportItemsTable,
  gutenbergImportJobsTable,
  type GutenbergImportCursor,
  type GutenbergImportFilters,
  type GutenbergImportItemMetadata,
  type GutenbergImportItemStatus,
  type GutenbergImportJobStatus,
  type GutenbergImportProgress,
} from "@readup/db";
import { db } from "@/db/client";
import { generationJobLeaseRetryAfterMs } from "@/lib/book-generation/job-lease";

export type GutenbergImportLease = {
  token: string;
  expires_at: string;
};

export function emptyImportProgress(requested: number): GutenbergImportProgress {
  return {
    requested,
    imported: 0,
    skipped: 0,
    failed: 0,
    processing: 0,
  };
}

export async function createGutenbergImportJob(args: {
  requestedCount: number;
  filters: GutenbergImportFilters;
  createdBy?: string | null;
}) {
  const progress = emptyImportProgress(args.requestedCount);
  const [job] = await db
    .insert(gutenbergImportJobsTable)
    .values({
      status: "queued",
      requestedCount: args.requestedCount,
      filters: args.filters,
      progress,
      cursor: { page: 1, candidate_ids: [], active_item_id: null },
      createdBy: args.createdBy ?? null,
    })
    .returning();
  if (!job) throw new Error("Failed to create Gutenberg import job");
  return job;
}

export async function getGutenbergImportJob(jobId: string) {
  const [job] = await db
    .select()
    .from(gutenbergImportJobsTable)
    .where(eq(gutenbergImportJobsTable.id, jobId))
    .limit(1);
  return job ?? null;
}

export async function listGutenbergImportItems(jobId: string) {
  return db
    .select()
    .from(gutenbergImportItemsTable)
    .where(eq(gutenbergImportItemsTable.jobId, jobId))
    .orderBy(asc(gutenbergImportItemsTable.createdAt));
}

export async function getGutenbergImportItem(itemId: string) {
  const [item] = await db
    .select()
    .from(gutenbergImportItemsTable)
    .where(eq(gutenbergImportItemsTable.id, itemId))
    .limit(1);
  return item ?? null;
}

export type GutenbergImportLeaseClaim =
  | { kind: "claimed"; job: NonNullable<Awaited<ReturnType<typeof getGutenbergImportJob>>> }
  | { kind: "busy"; retryAfterMs: number }
  | { kind: "terminal"; job: NonNullable<Awaited<ReturnType<typeof getGutenbergImportJob>>> }
  | { kind: "not_found" };

export async function claimGutenbergImportLease(args: {
  jobId: string;
  lease: GutenbergImportLease;
}): Promise<GutenbergImportLeaseClaim> {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(gutenbergImportJobsTable)
      .where(eq(gutenbergImportJobsTable.id, args.jobId))
      .limit(1)
      .for("update");

    if (!job) return { kind: "not_found" } as const;
    if (job.status === "succeeded") return { kind: "terminal", job } as const;

    const cursor = (job.cursor ?? {}) as GutenbergImportCursor;
    const retryAfterMs = generationJobLeaseRetryAfterMs(cursor.lease ?? null);
    if (retryAfterMs !== null) {
      return { kind: "busy", retryAfterMs } as const;
    }

    const nextCursor: GutenbergImportCursor = {
      ...cursor,
      lease: args.lease,
      heartbeat_at: new Date().toISOString(),
    };

    await tx
      .update(gutenbergImportJobsTable)
      .set({
        status: "running",
        lastError: null,
        cursor: nextCursor,
        updatedAt: new Date(),
      })
      .where(eq(gutenbergImportJobsTable.id, args.jobId));

    return {
      kind: "claimed",
      job: {
        ...job,
        status: "running",
        lastError: null,
        cursor: nextCursor,
        updatedAt: new Date(),
      },
    } as const;
  });
}

export async function releaseGutenbergImportLease(args: {
  jobId: string;
  leaseToken: string;
  status?: GutenbergImportJobStatus;
  error?: string | null;
  progress?: GutenbergImportProgress;
  cursorPatch?: Partial<GutenbergImportCursor>;
}): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(gutenbergImportJobsTable)
      .where(eq(gutenbergImportJobsTable.id, args.jobId))
      .limit(1)
      .for("update");
    if (!job) return false;

    const cursor = (job.cursor ?? {}) as GutenbergImportCursor;
    if (cursor.lease?.token !== args.leaseToken) return false;

    const nextCursor: GutenbergImportCursor = {
      ...cursor,
      ...(args.cursorPatch ?? {}),
      heartbeat_at: new Date().toISOString(),
    };
    delete nextCursor.lease;

    await tx
      .update(gutenbergImportJobsTable)
      .set({
        status: args.status ?? job.status,
        lastError: args.error === undefined ? job.lastError : args.error,
        progress: args.progress ?? job.progress,
        cursor: nextCursor,
        updatedAt: new Date(),
      })
      .where(eq(gutenbergImportJobsTable.id, args.jobId));
    return true;
  });
}

export async function insertGutenbergImportItem(args: {
  jobId: string;
  gutenbergId: number;
  title: string;
  author: string;
  metadata?: GutenbergImportItemMetadata;
  status?: GutenbergImportItemStatus;
}) {
  const [item] = await db
    .insert(gutenbergImportItemsTable)
    .values({
      jobId: args.jobId,
      gutenbergId: args.gutenbergId,
      title: args.title,
      author: args.author,
      metadata: args.metadata ?? {},
      status: args.status ?? "waiting",
    })
    .returning();
  if (!item) throw new Error("Failed to create Gutenberg import item");
  return item;
}

export async function updateGutenbergImportItem(
  itemId: string,
  patch: {
    status?: GutenbergImportItemStatus;
    workId?: string | null;
    generationJobId?: string | null;
    error?: string | null;
    metadata?: GutenbergImportItemMetadata;
    title?: string;
    author?: string;
  },
) {
  const [item] = await db
    .update(gutenbergImportItemsTable)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(gutenbergImportItemsTable.id, itemId))
    .returning();
  return item ?? null;
}

export async function recountImportProgress(
  jobId: string,
  requested: number,
): Promise<GutenbergImportProgress> {
  const items = await listGutenbergImportItems(jobId);
  const progress: GutenbergImportProgress = {
    requested,
    imported: 0,
    skipped: 0,
    failed: 0,
    processing: 0,
  };
  for (const item of items) {
    if (item.status === "completed") progress.imported += 1;
    else if (item.status === "skipped") progress.skipped += 1;
    else if (item.status === "failed") progress.failed += 1;
    else progress.processing += 1;
  }
  return progress;
}

export async function findActiveImportItem(
  jobId: string,
): Promise<typeof gutenbergImportItemsTable.$inferSelect | null> {
  const activeStatuses: GutenbergImportItemStatus[] = [
    "waiting",
    "fetching",
    "fetched",
    "generating_english",
    "generating_russian",
    "generating_english_tts",
    "generating_russian_tts",
    "saving",
  ];
  const [item] = await db
    .select()
    .from(gutenbergImportItemsTable)
    .where(
      and(
        eq(gutenbergImportItemsTable.jobId, jobId),
        inArray(gutenbergImportItemsTable.status, activeStatuses),
      ),
    )
    .orderBy(asc(gutenbergImportItemsTable.createdAt))
    .limit(1);
  return item ?? null;
}

export async function resetFailedImportItems(jobId: string): Promise<number> {
  const result = await db
    .update(gutenbergImportItemsTable)
    .set({
      status: "waiting",
      error: null,
      workId: null,
      generationJobId: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(gutenbergImportItemsTable.jobId, jobId),
        eq(gutenbergImportItemsTable.status, "failed"),
      ),
    )
    .returning({ id: gutenbergImportItemsTable.id });

  const job = await getGutenbergImportJob(jobId);
  if (job) {
    const cursor = { ...(job.cursor ?? {}), active_item_id: null } as GutenbergImportCursor;
    delete cursor.lease;
    await db
      .update(gutenbergImportJobsTable)
      .set({
        status: "queued",
        lastError: null,
        cursor,
        updatedAt: new Date(),
      })
      .where(eq(gutenbergImportJobsTable.id, jobId));
  }

  return result.length;
}

export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  if (code === "23505") return true;
  const message = error instanceof Error ? error.message : String(error);
  return /duplicate key|unique constraint/i.test(message);
}
