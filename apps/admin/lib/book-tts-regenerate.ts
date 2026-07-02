import { deleteAllBookTtsFromStorage } from "@/lib/book-audio-storage";
import { synthesizeFullBookTts } from "@/lib/book-tts-synthesize";
import type { BookWithContent } from "@/lib/book-relational";
import { updateBookTtsAudio, updateEditionStatus } from "@/lib/book-relational";
import { getBookAudioBucket } from "@/lib/supabase-storage";

export type BookTtsResponseExtras = {
  tts_preview_urls?: Record<string, Partial<Record<string, string>>>;
  tts_warning?: string;
  tts_skipped?: true;
};

/**
 * After relational content is persisted: deletes old MP3s for this book, generates
 * all voices/chunks, and updates `books.tts_audio`. Returns fields to merge into API JSON.
 */
export async function finalizeBookTtsForBook(book: BookWithContent): Promise<BookTtsResponseExtras> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const bucket = getBookAudioBucket();

  if (bucket) {
    await deleteAllBookTtsFromStorage(String(book.id));
  }

  if (!apiKey || !bucket) {
    await updateEditionStatus(book.id, "published");
    return { tts_skipped: true };
  }

  try {
    await updateEditionStatus(book.id, "generating_tts");
    const { tts_audio, previewUrls } = await synthesizeFullBookTts(book, apiKey);
    await updateBookTtsAudio(book.id, tts_audio);
    return { tts_preview_urls: previewUrls };
  } catch (e) {
    const message = e instanceof Error ? e.message : "TTS generation failed";
    console.error("finalizeBookTtsForRow:", e);
    await updateEditionStatus(book.id, "failed", "ttsError", message);
    return { tts_warning: message };
  }
}
