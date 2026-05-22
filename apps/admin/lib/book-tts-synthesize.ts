import OpenAI from "openai";
import {
  TTS_VOICE_IDS,
  type BookTtsAudio,
  type BookTtsVoicePaths,
  type TtsVoiceId,
} from "@readup/db";
import { getBookAudioSignedUrl, uploadBookTtsAudio } from "@/lib/book-audio-storage";
import { mergeBookTtsPart } from "@/lib/book-tts-audio";
import type { BookWithContent } from "@/lib/book-relational";
import {
  bookWithContentToSpeechText,
  chunkTextForTts,
  TTS_INPUT_MAX_CHARS,
} from "@/lib/book-tts-text";

const TTS_MODEL = "gpt-4o-mini-tts";

const TTS_INSTRUCTIONS =
  "Read clearly as audiobook narration with a calm, steady pace. Speak any title, author, and section labels in the same language as those labels; read the book body naturally in the language of the text.";

export type TtsPreviewUrlsByChunk = Record<string, Partial<Record<TtsVoiceId, string>>>;

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
): Promise<{ tts_audio: BookTtsAudio; previewUrls: TtsPreviewUrlsByChunk }> {
  const fullText = bookWithContentToSpeechText(book);
  const chunks = chunkTextForTts(fullText, TTS_INPUT_MAX_CHARS);
  if (chunks.length === 0) {
    throw new Error("No readable text to synthesize.");
  }

  const openai = new OpenAI({ apiKey });
  let tts: BookTtsAudio | undefined;
  const previewUrls: TtsPreviewUrlsByChunk = {};

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const input = chunks[chunkIndex]!;
    const paths: Partial<BookTtsVoicePaths> = {};

    for (const voice of TTS_VOICE_IDS) {
      const mp3 = await openai.audio.speech.create({
        model: TTS_MODEL,
        voice,
        input,
        instructions: TTS_INSTRUCTIONS,
        response_format: "mp3",
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      const uploaded = await uploadBookTtsAudio({
        bookId: String(book.id),
        chunkIndex,
        voice,
        buffer,
      });
      if (!uploaded.ok) {
        throw new Error(`Storage upload failed for part ${chunkIndex + 1}, voice ${voice}: ${uploaded.message}`);
      }
      paths[voice] = uploaded.path;
    }

    const voicePaths = paths as BookTtsVoicePaths;
    tts = mergeBookTtsPart(tts, chunkIndex, voicePaths);
    previewUrls[String(chunkIndex)] = await signVoicePaths(voicePaths);
  }

  return { tts_audio: tts!, previewUrls };
}

export function getTtsChunkCount(book: BookWithContent): number {
  const fullText = bookWithContentToSpeechText(book);
  return chunkTextForTts(fullText, TTS_INPUT_MAX_CHARS).length;
}
