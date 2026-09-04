import { parseBookContentInput } from "@/lib/book-content";
import { requireAdminApi } from "@/lib/admin-auth";
import { finalizeBookTtsForBook } from "@/lib/book-tts-regenerate";
import {
  deleteEditionById,
  getBookWithContent,
  replaceBookContent,
  type BookWithContent,
} from "@/lib/book-relational";

function parseId(param: string): number | null {
  const id = Number(param);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

export async function GET(
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

  const book = await getBookWithContent(id);
  if (!book) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(book);
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

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    return patchMultipart(request, id, existing);
  }
  return patchJson(request, id, existing);
}

function successResponse(book: BookWithContent, extras: Record<string, unknown>) {
  return Response.json({
    ok: true,
    id: book.id,
    book_id: String(book.id),
    work_id: book.workId,
    status: book.status,
    ...(book.coverImageUrl
      ? { cover_image_url: book.coverImageUrl, cover_image_path: book.coverImageUrl }
      : {}),
    ...extras,
  });
}

async function patchJson(request: Request, id: number, previous: BookWithContent) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBookContentInput(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.message }, { status: 400 });
  }

  const input = {
    ...parsed.data,
    cover_image_url: previous.coverImageUrl ?? undefined,
  };

  const book = await replaceBookContent(id, input);
  if (!book) return Response.json({ error: "Not found" }, { status: 404 });

  return successResponse(book, await finalizeBookTtsForBook(book));
}

async function patchMultipart(request: Request, id: number, previous: BookWithContent) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const bookField = form.get("book");
  if (typeof bookField !== "string") {
    return Response.json(
      { error: "Expected string field \"book\" with JSON payload" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(bookField);
  } catch {
    return Response.json({ error: "Invalid book JSON in multipart field" }, { status: 400 });
  }

  const parsed = parseBookContentInput(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.message }, { status: 400 });
  }

  // Cover uploads belong on PATCH /api/books/[id]/cover — ignore any cover file here.
  const input = {
    ...parsed.data,
    cover_image_url: previous.coverImageUrl ?? undefined,
  };

  const book = await replaceBookContent(id, input);
  if (!book) return Response.json({ error: "Not found" }, { status: 404 });

  return successResponse(book, await finalizeBookTtsForBook(book));
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

  try {
    const result = await deleteEditionById(id);
    if (!result) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("DELETE /api/books/[id]:", e);
    return Response.json(
      {
        error: e instanceof Error ? e.message : "Failed to delete language version",
      },
      { status: 500 },
    );
  }
}
