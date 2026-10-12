import { parseBookContentInput } from "@/lib/book-content";
import { requireAdminApi } from "@/lib/admin-auth";
import { validateCoverBytes } from "@/lib/cover-image";
import { finalizeBookTtsForBook } from "@/lib/book-tts-regenerate";
import { removeCoverFromStorage, uploadWorkCover } from "@/lib/cover-storage";
import {
  createBookWithContent,
  listBooks,
  updateBookCover,
  type BookWithContent,
} from "@/lib/book-relational";

const MAX_COVER_BYTES = 8 * 1024 * 1024;

function successResponse(book: BookWithContent, extras: Record<string, unknown>, status = 200) {
  const base: Record<string, unknown> = {
    ok: true,
    id: book.id,
    book_id: String(book.id),
    work_id: book.workId,
    status: book.status,
    ...(book.coverImageUrl
      ? { cover_image_url: book.coverImageUrl, cover_image_path: book.coverImageUrl }
      : {}),
  };
  Object.assign(base, extras);
  return Response.json(base, { status });
}

export async function POST(request: Request) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    return postMultipart(request);
  }
  return postJson(request);
}

async function postJson(request: Request) {
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

  const book = await createBookWithContent(parsed.data);
  return successResponse(book, await finalizeBookTtsForBook(book), 201);
}

async function postMultipart(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const bookField = form.get("book");
  if (typeof bookField !== "string") {
    return Response.json({ error: 'Expected string field "book" with JSON payload' }, { status: 400 });
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

  const coverField = form.get("cover");
  const cover = await validateCoverField(coverField);
  if (!cover.ok) {
    return Response.json({ error: cover.message }, { status: cover.status });
  }

  const book = await createBookWithContent({ ...parsed.data, cover_image_url: undefined });

  let bookForTts = book;
  if (cover.cover) {
    const uploaded = await uploadCover(book.workId, cover.cover);
    if (!uploaded.ok) {
      return Response.json({ error: uploaded.message }, { status: uploaded.status });
    }
    try {
      await updateBookCover(book.id, uploaded.path);
    } catch (error) {
      await removeCoverFromStorage(uploaded.path);
      throw error;
    }
    bookForTts = { ...book, coverImageUrl: uploaded.path };
  }

  return successResponse(bookForTts, await finalizeBookTtsForBook(bookForTts), 201);
}

type ValidCover =
  | { ok: true; cover?: { buffer: Buffer; mime: string; extension: string } }
  | { ok: false; message: string; status: number };

async function validateCoverField(field: FormDataEntryValue | null): Promise<ValidCover> {
  if (!(field instanceof File) || field.size <= 0) return { ok: true };
  if (field.size > MAX_COVER_BYTES) {
    return { ok: false, message: "Cover file is too large (max 8 MB).", status: 400 };
  }

  const buffer = Buffer.from(await field.arrayBuffer());
  const validated = validateCoverBytes(buffer, field.type);
  if (!validated.ok) {
    return { ok: false, message: validated.message, status: 400 };
  }
  return {
    ok: true,
    cover: {
      buffer,
      mime: validated.mime,
      extension: validated.extension,
    },
  };
}

async function uploadCover(
  workId: string,
  cover: { buffer: Buffer; mime: string; extension: string },
): Promise<{ ok: true; path: string } | { ok: false; message: string; status: number }> {
  try {
    return { ok: true, path: await uploadWorkCover(workId, cover) };
  } catch (e) {
    console.error(e);
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Storage configuration error",
      status: 500,
    };
  }
}

export async function GET() {
  const authError = await requireAdminApi();
  if (authError) return authError;

  return Response.json(await listBooks());
}
