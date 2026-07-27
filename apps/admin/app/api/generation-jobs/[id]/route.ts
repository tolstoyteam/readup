import "server-only";

import { requireAdminApi } from "@/lib/admin-auth";
import { getGenerationJob } from "@/lib/book-relational";
import type {
  BookGenerationJobPayload,
  GenerationJobProgress,
  GenerationJobResult,
} from "@/lib/book-generation/types";

function parseId(param: string): string | null {
  const trimmed = param.trim();
  if (!trimmed) return null;
  return trimmed;
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

  const job = await getGenerationJob(id);
  if (!job) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const payload = (job.payload ?? {}) as BookGenerationJobPayload;
  const progress = (payload.progress ?? null) as GenerationJobProgress | null;
  const result = (payload.result ?? null) as GenerationJobResult | null;

  return Response.json({
    id: job.id,
    work_id: job.workId,
    type: job.type,
    status: job.status,
    attempt_count: job.attemptCount,
    last_error: job.lastError,
    progress,
    heartbeat_at: payload.heartbeat_at ?? null,
    result,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  });
}
