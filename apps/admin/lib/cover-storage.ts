import "server-only";

import { validateCoverBytes } from "@/lib/cover-image";
import { getBookCoversBucket, getSupabaseAdmin } from "@/lib/supabase-storage";

const MAX_COVER_BYTES = 8 * 1024 * 1024;

export type ParsedCover = {
  buffer: Buffer;
  mime: string;
  extension: string;
};

export type CoverParseResult =
  | { ok: true; cover?: ParsedCover }
  | { ok: false; message: string };

export async function parseCoverUpload(
  field: FormDataEntryValue | null,
): Promise<CoverParseResult> {
  if (!(field instanceof File) || field.size <= 0) {
    return { ok: true };
  }
  if (field.size > MAX_COVER_BYTES) {
    return { ok: false, message: "Cover file is too large (max 8 MB)." };
  }

  const buffer = Buffer.from(await field.arrayBuffer());
  const validated = validateCoverBytes(buffer, field.type);
  if (!validated.ok) {
    return { ok: false, message: validated.message };
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

export async function uploadWorkCover(
  workId: string,
  cover: { buffer: Buffer; mime: string; extension: string },
): Promise<string> {
  if (cover.buffer.length > MAX_COVER_BYTES) {
    throw new Error("Cover file is too large (max 8 MB).");
  }

  const validated = validateCoverBytes(cover.buffer, cover.mime);
  if (!validated.ok) {
    throw new Error(validated.message);
  }

  const objectPath = `works/${workId}/cover.${validated.extension}`;
  const supabase = getSupabaseAdmin();
  const bucket = getBookCoversBucket();
  const { error } = await supabase.storage.from(bucket).upload(objectPath, cover.buffer, {
    contentType: validated.mime,
    upsert: true,
  });

  if (error) {
    console.error("Supabase storage upload:", error);
    throw new Error(
      "Failed to upload cover to storage. Check bucket name and service role permissions.",
    );
  }

  return objectPath;
}
