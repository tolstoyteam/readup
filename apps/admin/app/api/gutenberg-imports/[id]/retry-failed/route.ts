import "server-only";

import { requireAdminApi } from "@/lib/admin-auth";
import { gutenbergImportJobResponse } from "@/lib/gutenberg/job-response";
import { getGutenbergImportSnapshot } from "@/lib/gutenberg/orchestrate-import";
import {
  recountImportProgress,
  resetFailedImportItems,
} from "@/lib/gutenberg/relational";

export const runtime = "nodejs";
export const maxDuration = 30;

function parseId(param: string): string | null {
  const trimmed = param.trim();
  return trimmed || null;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  const { id: idParam } = await context.params;
  const id = parseId(idParam);
  if (!id) {
    return Response.json({ error: "Invalid job id." }, { status: 400 });
  }

  const snapshot = await getGutenbergImportSnapshot(id);
  if (!snapshot) {
    return Response.json({ error: "Import job not found." }, { status: 404 });
  }

  const resetCount = await resetFailedImportItems(id);
  console.info("[gutenberg_import] retry failed", { jobId: id, resetCount });

  const next = await getGutenbergImportSnapshot(id);
  if (!next) {
    return Response.json({ error: "Import job not found." }, { status: 404 });
  }

  const progress = await recountImportProgress(id, next.job.requestedCount);

  return Response.json({
    ...gutenbergImportJobResponse(next.job, next.items, progress),
    reset_count: resetCount,
  });
}
