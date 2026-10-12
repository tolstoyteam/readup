import { requireAdminApi } from "@/lib/admin-auth";
import { previewCover } from "@/lib/cover-design-service";

export const runtime = "nodejs";
type Context = { params: Promise<{ workId: string }> };

export async function GET(_request: Request, context: Context) {
  const auth = await requireAdminApi(); if (auth) return auth;
  try {
    const { workId } = await context.params;
    const buffer = await previewCover(workId);
    return new Response(new Uint8Array(buffer), {
      headers: { "content-type": "image/png", "cache-control": "no-store" },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Preview failed." }, { status: 400 });
  }
}
