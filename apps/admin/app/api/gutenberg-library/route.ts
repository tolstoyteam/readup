import "server-only";

import { z } from "zod";
import { getAdminAuth, requireAdminApi } from "@/lib/admin-auth";
import { createCollectionJob, listSourceBooks } from "@/lib/gutenberg/collect-source";

export const runtime = "nodejs";

const requestSchema = z.object({
  count: z.coerce.number().int().min(1).max(100),
  genre: z.string().trim().max(200).optional(),
  author: z.string().trim().max(200).optional(),
  year: z.coerce.number().int().min(-3000).max(2100).optional(),
});

export async function GET() {
  const authError = await requireAdminApi();
  if (authError) return authError;
  return Response.json(await listSourceBooks());
}

export async function POST(request: Request) {
  const auth = await getAdminAuth();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  if (!process.env.GUTENBERG_API_KEY?.trim()) {
    return Response.json({ error: "GUTENBERG_API_KEY is not configured on the server." }, { status: 500 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const { count, genre, author, year } = parsed.data;
  const job = await createCollectionJob({
    count,
    filters: {
      ...(genre ? { genre } : {}),
      ...(author ? { author } : {}),
      ...(year != null ? { year } : {}),
    },
    createdBy: auth.userId,
  });
  return Response.json({ job_id: job.id }, { status: 202 });
}
