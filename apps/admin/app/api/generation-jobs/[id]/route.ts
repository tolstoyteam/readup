import "server-only";

import { requireAdminApi } from "@/lib/admin-auth";
import { getGenerationJob } from "@/lib/book-relational";
import { generationJobResponse } from "@/lib/book-generation/job-response";

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

  return Response.json(generationJobResponse(job));
}
