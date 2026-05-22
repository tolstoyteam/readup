import { getBookAudioBucket, getSupabaseAdmin } from "@/lib/supabase-storage";

const DEFAULT_SIGNED_TTL_SEC = 3600;

export async function getBookAudioSignedUrl(
  path: string,
  expiresSec: number = DEFAULT_SIGNED_TTL_SEC,
): Promise<string | null> {
  const bucket = getBookAudioBucket();
  if (!bucket) return null;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresSec);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/** Object path inside the audio bucket (not a full URL). */
export function bookTtsObjectPath(bookId: string, chunkIndex: number, voice: string): string {
  const safeVoice = voice.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "voice";
  const part = String(chunkIndex).padStart(3, "0");
  return `${bookId}/tts/part-${part}-${safeVoice}.mp3`;
}

export type UploadBookTtsResult = { ok: true; path: string } | { ok: false; message: string };

/** Removes every object under `{bookId}/tts/` in the audio bucket (best-effort). */
export async function deleteAllBookTtsFromStorage(bookId: string): Promise<void> {
  const bucket = getBookAudioBucket();
  if (!bucket) return;

  const prefix = `${bookId}/tts`;
  try {
    const supabase = getSupabaseAdmin();
    const pageSize = 200;
    for (;;) {
      const { data: files, error } = await supabase.storage.from(bucket).list(prefix, {
        limit: pageSize,
        offset: 0,
      });
      if (error) {
        console.error("TTS storage list for delete:", error);
        return;
      }
      if (!files?.length) break;
      const paths = files.filter((f) => f.name).map((f) => `${prefix}/${f.name}`);
      if (paths.length === 0) break;
      const { error: rmError } = await supabase.storage.from(bucket).remove(paths);
      if (rmError) {
        console.error("TTS storage remove:", rmError);
        return;
      }
      if (files.length < pageSize) break;
    }
  } catch (e) {
    console.error("deleteAllBookTtsFromStorage:", e);
  }
}

export async function uploadBookTtsAudio(params: {
  bookId: string;
  chunkIndex: number;
  voice: string;
  buffer: Buffer;
}): Promise<UploadBookTtsResult> {
  const bucket = getBookAudioBucket();
  if (!bucket) {
    return { ok: false, message: "SUPABASE_BOOK_AUDIO_BUCKET is not set" };
  }

  const path = bookTtsObjectPath(params.bookId, params.chunkIndex, params.voice);

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(bucket).upload(path, params.buffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, path };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Storage upload failed";
    return { ok: false, message };
  }
}
