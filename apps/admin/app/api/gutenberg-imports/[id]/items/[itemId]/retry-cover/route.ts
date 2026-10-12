import "server-only";

import { requireAdminApi } from "@/lib/admin-auth";
import {
  ensureAiWorkCover,
  getWorkCoverPath,
  isCoverAttemptInFlight,
} from "@/lib/cover-ensure";
import { gutenbergImportJobResponse } from "@/lib/gutenberg/job-response";
import { getGutenbergImportSnapshot } from "@/lib/gutenberg/orchestrate-import";
import {
  getGutenbergImportItem,
  recountImportProgress,
  updateGutenbergImportItem,
} from "@/lib/gutenberg/relational";

export const runtime = "nodejs";
export const maxDuration = 300;

function parseId(param: string): string | null {
  const trimmed = param.trim();
  return trimmed || null;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; itemId: string }> },
) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  const { id: jobIdParam, itemId: itemIdParam } = await context.params;
  const jobId = parseId(jobIdParam);
  const itemId = parseId(itemIdParam);
  if (!jobId || !itemId) {
    return Response.json({ error: "Invalid job or item id." }, { status: 400 });
  }

  const snapshot = await getGutenbergImportSnapshot(jobId);
  if (!snapshot) {
    return Response.json({ error: "Import job not found." }, { status: 404 });
  }

  const item = await getGutenbergImportItem(itemId);
  if (!item || item.jobId !== jobId) {
    return Response.json({ error: "Import item not found." }, { status: 404 });
  }

  if (!item.workId) {
    return Response.json(
      { error: "This item has no book work yet. Cover retry is unavailable." },
      { status: 409 },
    );
  }

  const existingPath = await getWorkCoverPath(item.workId);
  if (existingPath) {
    await updateGutenbergImportItem(itemId, {
      metadata: {
        ...item.metadata,
        cover: {
          status: "skipped",
          path: existingPath,
          error: null,
          stage: "exists",
        },
      },
    });
    const next = await getGutenbergImportSnapshot(jobId);
    if (!next) {
      return Response.json({ error: "Import job not found." }, { status: 404 });
    }
    const progress = await recountImportProgress(jobId, next.job.requestedCount);
    return Response.json({
      ...gutenbergImportJobResponse(next.job, next.items, progress),
      cover_result: "already_exists",
      cover_path: existingPath,
    });
  }

  if (isCoverAttemptInFlight(item.metadata?.cover)) {
    return Response.json(
      {
        error: "Cover generation is already in progress for this item.",
        busy: true,
      },
      { status: 409 },
    );
  }

  // Claim lock before starting paid generation (best-effort concurrency control).
  await updateGutenbergImportItem(itemId, {
    metadata: {
      ...item.metadata,
      cover: {
        status: "generating",
        error: null,
        stage: "generate",
        path: null,
      },
    },
  });

  const result = await ensureAiWorkCover({
    workId: item.workId,
    title: item.title,
    author: item.author,
    subjects: item.metadata?.subjects,
    bookshelves: item.metadata?.bookshelves,
    onStatus: async (cover) => {
      const fresh = await getGutenbergImportItem(itemId);
      await updateGutenbergImportItem(itemId, {
        metadata: { ...(fresh?.metadata ?? item.metadata), cover },
      });
    },
  });

  console.info("[gutenberg_import] retry cover", {
    jobId,
    itemId,
    workId: item.workId,
    ok: result.ok,
    status: result.cover.status,
    stage: result.cover.stage,
  });

  const next = await getGutenbergImportSnapshot(jobId);
  if (!next) {
    return Response.json({ error: "Import job not found." }, { status: 404 });
  }
  const progress = await recountImportProgress(jobId, next.job.requestedCount);

  if (!result.ok) {
    return Response.json(
      {
        ...gutenbergImportJobResponse(next.job, next.items, progress),
        cover_result: "failed",
        error: result.cover.error ?? "Cover generation failed.",
      },
      { status: 502 },
    );
  }

  return Response.json({
    ...gutenbergImportJobResponse(next.job, next.items, progress),
    cover_result: result.cover.status === "skipped" ? "already_exists" : "completed",
    cover_path: result.path,
  });
}
