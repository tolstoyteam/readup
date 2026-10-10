import "server-only";

import { requireAdminApi } from "@/lib/admin-auth";
import { gutenbergImportJobResponse } from "@/lib/gutenberg/job-response";
import { getGutenbergImportSnapshot } from "@/lib/gutenberg/orchestrate-import";

export const runtime = "nodejs";
export const maxDuration = 30;

function parseId(param: string): string | null {
  const trimmed = param.trim();
  return trimmed || null;
}

export async function GET(
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

  return Response.json(
    gutenbergImportJobResponse(snapshot.job, snapshot.items, snapshot.job.progress),
  );
}
