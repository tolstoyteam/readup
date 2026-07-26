import { requireAdminApi } from "@/lib/admin-auth";
import { deleteWorkById } from "@/lib/book-relational";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ workId: string }> },
) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  const { workId } = await context.params;
  if (!UUID_RE.test(workId)) {
    return Response.json({ error: "Invalid work id" }, { status: 400 });
  }

  try {
    const result = await deleteWorkById(workId);
    if (!result) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("DELETE /api/books/works/[workId]:", e);
    return Response.json(
      {
        error: e instanceof Error ? e.message : "Failed to delete book",
      },
      { status: 500 },
    );
  }
}
