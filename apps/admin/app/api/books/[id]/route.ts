import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { booksTable } from "@readup/db";
import { deleteAllBookTtsFromStorage } from "@/lib/book-audio-storage";
import { parseBookContentInput } from "@/lib/book-content";
import { validateCoverBytes } from "@/lib/cover-image";
import { finalizeBookTtsForBook } from "@/lib/book-tts-regenerate";
import {
  getBookWithContent,
  replaceBookContent,
  type BookWithContent,
} from "@/lib/book-relational";
import { getBookCoversBucket, getSupabaseAdmin } from "@/lib/supabase-storage";

const MAX_COVER_BYTES = 8 * 1024 * 1024;

function parseId(param: string): number | null {
  const id = Number(param);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

async function removeCoverFromStorage(path: string) {
  try {
    const supabase = getSupabaseAdmin();
    const bucket = getBookCoversBucket();
    await supabase.storage.from(bucket).remove([path]);
  } catch {
    /* best-effort */
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

  const hasCoverField = body && typeof body === "object" && "cover_image_url" in body;
  const input = hasCoverField
    ? parsed.data
    : { ...parsed.data, cover_image_url: previous.coverImageUrl ?? undefined };
  const oldCover = previous.coverImageUrl;
  const newCover = input.cover_image_url;
  if (oldCover && oldCover !== newCover) {
    await removeCoverFromStorage(oldCover);
  }

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

  const coverField = form.get("cover");
  const cover = await validateCoverField(coverField);
  if (!cover.ok) {
    return Response.json({ error: cover.message }, { status: cover.status });
  }

  const hasCoverField = body && typeof body === "object" && "cover_image_url" in body;
  let input = hasCoverField
    ? parsed.data
    : { ...parsed.data, cover_image_url: previous.coverImageUrl ?? undefined };
  if (cover.cover) {
    const uploaded = await uploadCover(previous.workId, cover.cover);
    if (!uploaded.ok) {
      return Response.json({ error: uploaded.message }, { status: uploaded.status });
    }
    if (previous.coverImageUrl && previous.coverImageUrl !== uploaded.path) {
      await removeCoverFromStorage(previous.coverImageUrl);
    }
    input = { ...input, cover_image_url: uploaded.path };
  }

  const book = await replaceBookContent(id, input);
  if (!book) return Response.json({ error: "Not found" }, { status: 404 });

  return successResponse(book, await finalizeBookTtsForBook(book));
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
    cover: { buffer, mime: validated.mime, extension: validated.extension },
  };
}

async function uploadCover(
  workId: string,
  cover: { buffer: Buffer; mime: string; extension: string },
): Promise<{ ok: true; path: string } | { ok: false; message: string; status: number }> {
  const objectPath = `works/${workId}/cover.${cover.extension}`;

  try {
    const supabase = getSupabaseAdmin();
    const bucket = getBookCoversBucket();
    const { error } = await supabase.storage.from(bucket).upload(objectPath, cover.buffer, {
      contentType: cover.mime,
      upsert: true,
    });
    if (error) {
      console.error("Supabase storage upload:", error);
      return {
        ok: false,
        message: "Failed to upload cover to storage. Check bucket name and service role permissions.",
        status: 502,
      };
    }
  } catch (e) {
    console.error(e);
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Storage configuration error",
      status: 500,
    };
  }

  return { ok: true, path: objectPath };
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: idParam } = await context.params;
  const id = parseId(idParam);
  if (id === null) {
    return Response.json({ error: "Invalid book id" }, { status: 400 });
  }

  const existing = await getBookWithContent(id);
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.coverImageUrl) {
    await removeCoverFromStorage(existing.coverImageUrl);
  }

  await deleteAllBookTtsFromStorage(String(existing.id));

  await db.delete(booksTable).where(eq(booksTable.id, id));

  return Response.json({ ok: true });
}
