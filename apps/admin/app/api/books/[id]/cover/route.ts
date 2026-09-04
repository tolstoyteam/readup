import { requireAdminApi } from "@/lib/admin-auth";
import {
  getBookWithContent,
  updateBookCover,
} from "@/lib/book-relational";
import {
  parseCoverUpload,
  removeCoverFromStorage,
  uploadWorkCover,
} from "@/lib/cover-storage";

function parseId(param: string): number | null {
  const id = Number(param);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

function coverSuccessResponse(
  bookId: number,
  workId: string,
  coverImageUrl: string | null,
) {
  return Response.json({
    ok: true,
    id: bookId,
    book_id: String(bookId),
    work_id: workId,
    ...(coverImageUrl
      ? { cover_image_url: coverImageUrl, cover_image_path: coverImageUrl }
      : { cover_image_url: null, cover_image_path: null }),
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  const { id: idParam } = await context.params;
  const id = parseId(idParam);
  if (id === null) {
    return Response.json({ error: "Invalid book id" }, { status: 400 });
  }

  const existing = await getBookWithContent(id);
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const coverField = form.get("cover");
  const parsed = await parseCoverUpload(coverField);
  if (!parsed.ok) {
    return Response.json({ error: parsed.message }, { status: 400 });
  }
  if (!parsed.cover) {
    return Response.json(
      { error: "Expected a cover image file in the \"cover\" field." },
      { status: 400 },
    );
  }

  let newPath: string;
  try {
    newPath = await uploadWorkCover(existing.workId, parsed.cover);
  } catch (e) {
    console.error("PATCH /api/books/[id]/cover upload:", e);
    return Response.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Failed to upload cover to storage.",
      },
      { status: 502 },
    );
  }

  await updateBookCover(id, newPath);

  const oldCover = existing.coverImageUrl;
  if (oldCover && oldCover !== newPath) {
    await removeCoverFromStorage(oldCover);
  }

  return coverSuccessResponse(id, existing.workId, newPath);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  const { id: idParam } = await context.params;
  const id = parseId(idParam);
  if (id === null) {
    return Response.json({ error: "Invalid book id" }, { status: 400 });
  }

  const existing = await getBookWithContent(id);
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const oldCover = existing.coverImageUrl;
  await updateBookCover(id, null);

  if (oldCover) {
    await removeCoverFromStorage(oldCover);
  }

  return coverSuccessResponse(id, existing.workId, null);
}
