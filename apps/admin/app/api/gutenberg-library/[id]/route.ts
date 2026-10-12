import "server-only";

import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { getCollectionJobResponse } from "@/lib/gutenberg/collect-source";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = await requireAdminApi();
  if (authError) return authError;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) {
    return Response.json({ error: "Invalid collection job id." }, { status: 400 });
  }
  const job = await getCollectionJobResponse(id);
  return job
    ? Response.json(job)
    : Response.json({ error: "Collection job not found." }, { status: 404 });
}
