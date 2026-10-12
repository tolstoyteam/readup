import "server-only";

import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import {
  enqueueSavedSourceBooks,
  listSavedSourceBooks,
  type SourceAppFilter,
} from "@/lib/gutenberg/source-library";

export const runtime = "nodejs";
export const maxDuration = 60;

const selectionSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100)
    .refine((ids) => new Set(ids).size === ids.length, "Choose each book only once."),
});

export async function GET(request: Request) {
  const authError = await requireAdminApi();
  if (authError) return authError;
  const url = new URL(request.url);
  const page = z.coerce.number().int().min(1).max(10_000).safeParse(url.searchParams.get("page") ?? 1);
  const appFilter = z.enum(["all", "waiting", "published"])
    .safeParse(url.searchParams.get("app_status") ?? "all");
  const query = (url.searchParams.get("q") ?? "").trim();
  if (!page.success || !appFilter.success || query.length > 200) {
    return Response.json({ error: "Invalid Gutenberg book query." }, { status: 400 });
  }
  return Response.json(await listSavedSourceBooks({
    page: page.data,
    query,
    appFilter: appFilter.data as SourceAppFilter,
  }));
}

export async function POST(request: Request) {
  const authError = await requireAdminApi();
  if (authError) return authError;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = selectionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid book selection." }, { status: 400 });
  }
  return Response.json({ items: await enqueueSavedSourceBooks(parsed.data.ids) }, { status: 202 });
}
