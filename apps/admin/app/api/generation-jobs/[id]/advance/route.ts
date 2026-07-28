import "server-only";

import { requireAdminApi } from "@/lib/admin-auth";
import { advanceBookGenerationJob } from "@/lib/book-generation/orchestrate";
import { generationJobResponse } from "@/lib/book-generation/job-response";
import { getGenerationJob } from "@/lib/book-relational";

export const runtime = "nodejs";
export const maxDuration = 300;

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

  const advanced = await advanceBookGenerationJob(id);
  if (advanced.kind === "not_found") {
    return Response.json({ error: "Generation job not found." }, { status: 404 });
  }

  const job = await getGenerationJob(id);
  if (!job) {
    return Response.json({ error: "Generation job not found." }, { status: 404 });
  }

  return Response.json({
    ...generationJobResponse(job),
    busy: advanced.kind === "busy",
    retry_after_ms: advanced.kind === "busy" ? advanced.retryAfterMs : 0,
  });
}
