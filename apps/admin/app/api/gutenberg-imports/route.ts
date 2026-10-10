import "server-only";

import { getAdminAuth, requireAdminApi } from "@/lib/admin-auth";
import { createGutenbergImportJob } from "@/lib/gutenberg/relational";
import { parseGutenbergImportRequest } from "@/lib/gutenberg/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  const auth = await getAdminAuth();
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseGutenbergImportRequest(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.message }, { status: 400 });
  }

  if (!process.env.GUTENBERG_API_KEY?.trim()) {
    return Response.json(
      { error: "GUTENBERG_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const filters = {
    ...(parsed.data.genre ? { genre: parsed.data.genre } : {}),
    ...(parsed.data.author ? { author: parsed.data.author } : {}),
    ...(parsed.data.year != null ? { year: parsed.data.year } : {}),
  };

  console.info("[gutenberg_import] job started", {
    requested: parsed.data.count,
    filters,
    createdBy: auth.userId,
  });

  const job = await createGutenbergImportJob({
    requestedCount: parsed.data.count,
    filters,
    createdBy: auth.userId,
  });

  return Response.json(
    {
      job_id: job.id,
      requested_count: job.requestedCount,
      filters: job.filters,
      status: job.status,
    },
    { status: 202 },
  );
}
