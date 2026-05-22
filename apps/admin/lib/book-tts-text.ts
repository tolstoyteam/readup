import type { ChapterBlockContent, ChapterBlockType } from "@readup/db";
import type { BookWithContent } from "@/lib/book-relational";
import { ttsPhrasesForLanguage } from "@/lib/book-tts-phrases";

/** OpenAI Speech API `input` max length (characters). */
export const TTS_INPUT_MAX_CHARS = 4096;

function blockToSpeechParts(
  type: ChapterBlockType,
  content: ChapterBlockContent,
  phrases: ReturnType<typeof ttsPhrasesForLanguage>,
): string[] {
  switch (type) {
    case "paragraph":
      return content.text.trim() ? [content.text.trim()] : [];
    case "quote": {
      const body = content.text.trim();
      if (!body) return [];
      const source = "source" in content && content.source ? ` ${content.source}` : "";
      return [`${phrases.quotePrefix} ${body}${source}`];
    }
    default:
      return [];
  }
}

/**
 * Full spoken script: localized title/author intro, then normalized blocks in reading order.
 */
export function bookWithContentToSpeechText(book: BookWithContent): string {
  const phrases = ttsPhrasesForLanguage(book.language);
  const intro = `${phrases.titleLabel}: ${book.title}. ${phrases.authorLabel}: ${book.author}.`;

  const lines: string[] = [intro];
  for (const chapter of book.chapters) {
    if (chapter.title.trim()) {
      lines.push(chapter.title.trim());
    }
    for (const block of chapter.blocks) {
      lines.push(...blockToSpeechParts(block.type, block.content, phrases));
    }
  }
  const keywords = book.keywords.map((keyword) => keyword.trim()).filter(Boolean).join(", ");
  if (keywords) {
    lines.push(`${phrases.keywordsPrefix} ${keywords}`);
  }
  return lines.join("\n\n").replace(/\s+\n/g, "\n").trim();
}

/**
 * Splits text into segments each ≤ maxChars, preferring paragraph and sentence breaks.
 */
export function chunkTextForTts(text: string, maxChars: number = TTS_INPUT_MAX_CHARS): string[] {
  const t = text.replace(/\r\n/g, "\n").trim();
  if (!t) return [];
  if (t.length <= maxChars) return [t];

  const chunks: string[] = [];
  let rest = t;
  const minRel = Math.max(64, Math.floor(maxChars * 0.2));

  while (rest.length > maxChars) {
    const slice = rest.slice(0, maxChars);
    let end = -1;

    const nn = slice.lastIndexOf("\n\n");
    if (nn >= minRel) end = nn + 2;

    if (end < 0) {
      const dot = slice.lastIndexOf(". ");
      if (dot >= minRel) end = dot + 2;
    }

    if (end < 0) {
      const nl = slice.lastIndexOf("\n");
      if (nl >= minRel) end = nl + 1;
    }

    if (end < 0) {
      const sp = slice.lastIndexOf(" ");
      if (sp >= minRel) end = sp + 1;
    }

    if (end < 0) end = maxChars;

    const part = rest.slice(0, end).trim();
    if (!part) {
      chunks.push(rest.slice(0, maxChars));
      rest = rest.slice(maxChars).trimStart();
      continue;
    }
    chunks.push(part);
    rest = rest.slice(end).trimStart();
  }
  if (rest) chunks.push(rest);
  return chunks;
}
