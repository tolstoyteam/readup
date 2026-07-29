import { requireAdminApi } from "@/lib/admin-auth";
import { deleteWorkById, isWorkUuid } from "@/lib/book-relational";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ workId: string }> },
) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  const { workId } = await context.params;
  if (!isWorkUuid(workId)) {
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
