import { synthesizeFullBookTts, type TtsSynthesisProgress } from "@/lib/book-tts-synthesize";
import { TtsSynthesisError } from "@/lib/book-tts-errors";
import type { BookWithContent } from "@/lib/book-relational";
import { updateBookTtsAudio, updateEditionStatus } from "@/lib/book-relational";
import { getBookAudioBucket } from "@/lib/supabase-storage";

export type BookTtsResponseExtras = {
  tts_preview_urls?: Record<string, Partial<Record<string, string>>>;
  tts_warning?: string;
  tts_skipped?: true;
};

export type FinalizeBookTtsOptions = {
  /** When true, failures propagate instead of returning `tts_warning`. */
  throwOnError?: boolean;
  onProgress?: (event: TtsSynthesisProgress) => void;
};

/**
 * Generates all voices/chunks and updates `books.tts_audio`. Does not delete existing
 * storage objects until synthesis succeeds (orphan cleanup runs after success).
 */
export async function finalizeBookTtsForBook(
  book: BookWithContent,
  options: FinalizeBookTtsOptions = {},
): Promise<BookTtsResponseExtras> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const bucket = getBookAudioBucket();

  if (!apiKey || !bucket) {
    await updateEditionStatus(book.id, "published");
    return { tts_skipped: true };
  }

  try {
    await updateEditionStatus(book.id, "generating_tts");
    const { tts_audio, previewUrls } = await synthesizeFullBookTts(book, apiKey, {
      onProgress: options.onProgress,
    });
    await updateBookTtsAudio(book.id, tts_audio);
    return { tts_preview_urls: previewUrls };
  } catch (e) {
    const message =
      e instanceof TtsSynthesisError
        ? e.message
        : e instanceof Error
          ? e.message
          : "TTS generation failed";
    console.error("finalizeBookTtsForBook:", {
      bookId: book.id,
      language: book.language,
      error: e instanceof Error ? { message: e.message, stack: e.stack } : e,
    });
    await updateEditionStatus(book.id, "failed", "ttsError", message);
    if (options.throwOnError) {
      throw e instanceof Error ? e : new Error(message);
    }
    return { tts_warning: message };
  }
}
