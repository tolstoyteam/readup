import OpenAI from "openai";
import {
  TTS_VOICE_IDS,
  type BookTtsAudio,
  type BookTtsVoicePaths,
  type TtsVoiceId,
} from "@readup/db";
import {
  deleteOrphanTtsChunks,
  getBookAudioSignedUrl,
  uploadBookTtsAudio,
} from "@/lib/book-audio-storage";
import { mergeBookTtsPart, fullTtsChunkIndexes } from "@/lib/book-tts-audio";
import { logTtsError, TtsSynthesisError } from "@/lib/book-tts-errors";
import type { BookWithContent } from "@/lib/book-relational";
import {
  bookWithContentToSpeechText,
  chunkTextForTts,
  TTS_INPUT_MAX_CHARS,
} from "@/lib/book-tts-text";
import { withExponentialBackoff } from "@/lib/retry";

const TTS_MODEL = "gpt-4o-mini-tts";

const TTS_INSTRUCTIONS =
  "Read clearly as audiobook narration with a calm, steady pace. Speak any title, author, and section labels in the same language as those labels; read the book body naturally in the language of the text.";

export type TtsPreviewUrlsByChunk = Record<string, Partial<Record<TtsVoiceId, string>>>;

export type TtsSynthesisProgress = {
  chunkIndex: number;
  chunkCount: number;
  voice: TtsVoiceId;
};

export type SynthesizeFullBookTtsOptions = {
  onProgress?: (event: TtsSynthesisProgress) => void;
};

async function signVoicePaths(paths: BookTtsVoicePaths): Promise<Partial<Record<TtsVoiceId, string>>> {
  const out: Partial<Record<TtsVoiceId, string>> = {};
  for (const voice of TTS_VOICE_IDS) {
    const url = await getBookAudioSignedUrl(paths[voice]);
    if (url) out[voice] = url;
  }
  return out;
}

/**
 * For each text chunk, generates Alloy / Nova / Ash, uploads to Storage, merges `tts_audio`.
 */
export async function synthesizeFullBookTts(
  book: BookWithContent,
  apiKey: string,
  options: SynthesizeFullBookTtsOptions = {},
): Promise<{ tts_audio: BookTtsAudio; previewUrls: TtsPreviewUrlsByChunk }> {
  const fullText = bookWithContentToSpeechText(book);
  const chunks = chunkTextForTts(fullText, TTS_INPUT_MAX_CHARS);
  if (chunks.length === 0) {
    throw new TtsSynthesisError("No readable text to synthesize.", {
      bookId: book.id,
      language: book.language,
    });
  }

  const openai = new OpenAI({ apiKey });
  let tts: BookTtsAudio | undefined;
  const previewUrls: TtsPreviewUrlsByChunk = {};

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const input = chunks[chunkIndex]!;
    const paths: Partial<BookTtsVoicePaths> = {};

    for (const voice of TTS_VOICE_IDS) {
      options.onProgress?.({ chunkIndex, chunkCount: chunks.length, voice });

      const ctx = {
        bookId: book.id,
        language: book.language,
        chunkIndex,
        voice,
      };

      try {
        const buffer = await withExponentialBackoff(
          async () => {
            const mp3 = await openai.audio.speech.create({
              model: TTS_MODEL,
              voice,
              input,
              instructions: TTS_INSTRUCTIONS,
              response_format: "mp3",
            });
            return Buffer.from(await mp3.arrayBuffer());
          },
          {
            label: `tts book=${book.id} lang=${book.language} chunk=${chunkIndex} voice=${voice}`,
            onRetry: ({ attempt }) => {
              logTtsError({ ...ctx, attempt }, new Error("retrying TTS request"));
            },
          },
        );

        const uploaded = await withExponentialBackoff(
          async () => {
            const result = await uploadBookTtsAudio({
              bookId: String(book.id),
              chunkIndex,
              voice,
              buffer,
            });
            if (!result.ok) {
              throw new Error(
                `Storage upload failed for part ${chunkIndex + 1}, voice ${voice}: ${result.message}`,
              );
            }
            return result;
          },
          { label: `tts-upload book=${book.id} chunk=${chunkIndex} voice=${voice}` },
        );

        paths[voice] = uploaded.path;
      } catch (error) {
        logTtsError(ctx, error);
        const message =
          error instanceof Error
            ? error.message
            : `TTS failed for chunk ${chunkIndex + 1}, voice ${voice}`;
        throw new TtsSynthesisError(message, ctx, error);
      }
    }

    const voicePaths = paths as BookTtsVoicePaths;
    tts = mergeBookTtsPart(tts, chunkIndex, voicePaths);
    previewUrls[String(chunkIndex)] = await signVoicePaths(voicePaths);
  }

  const completed = fullTtsChunkIndexes(tts!);
  if (completed.length !== chunks.length) {
    throw new TtsSynthesisError(
      `Incomplete TTS metadata: expected ${chunks.length} chunks, got ${completed.length}.`,
      { bookId: book.id, language: book.language },
    );
  }

  const maxChunkIndex = chunks.length - 1;
  await deleteOrphanTtsChunks(String(book.id), maxChunkIndex);

  return { tts_audio: tts!, previewUrls };
}

export function getTtsChunkCount(book: BookWithContent): number {
  const fullText = bookWithContentToSpeechText(book);
  return chunkTextForTts(fullText, TTS_INPUT_MAX_CHARS).length;
}
