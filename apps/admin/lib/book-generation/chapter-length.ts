import type { LengthPreset } from "./length-presets";

/**
 * Count sentences in plain text with a simple punctuation-based splitter.
 * Handles common abbreviations so "Dr. Smith went home." stays one sentence.
 */
export function countSentences(text: string): number {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return 0;

  // Protect common abbreviations from being treated as sentence ends.
  const protectedText = normalized
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|U\.S|U\.K)\./gi, "$1\u0000")
    .replace(/(\d)\.(\d)/g, "$1\u0000$2");

  const parts = protectedText
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.replace(/\u0000/g, ".").trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) return 0;

  // Trailing text without terminal punctuation still counts as a sentence.
  return parts.length;
}

export type ChapterSentenceInfo = {
  title: string;
  sentenceCount: number;
  inSoftRange: boolean;
};

export function chapterNarrativeSentenceCount(
  chapter: { title: string; blocks: { type: string; text: string }[] },
): number {
  const narrative = chapter.blocks
    .filter((block) => block.type === "paragraph")
    .map((block) => block.text)
    .join(" ");
  return countSentences(narrative);
}

export function analyzeChapterSentenceLengths(
  chapters: { title: string; blocks: { type: string; text: string }[] }[],
  preset: LengthPreset,
): ChapterSentenceInfo[] {
  return chapters.map((chapter) => {
    const sentenceCount = chapterNarrativeSentenceCount(chapter);
    return {
      title: chapter.title,
      sentenceCount,
      inSoftRange:
        sentenceCount >= preset.softMinSentencesPerChapter &&
        sentenceCount <= preset.softMaxSentencesPerChapter,
    };
  });
}

export function chaptersOutsideSoftRange(
  chapters: { title: string; blocks: { type: string; text: string }[] }[],
  preset: LengthPreset,
): ChapterSentenceInfo[] {
  return analyzeChapterSentenceLengths(chapters, preset).filter(
    (chapter) => !chapter.inSoftRange,
  );
}

export function buildLengthCorrectionAddendum(
  outliers: ChapterSentenceInfo[],
  preset: LengthPreset,
): string {
  const lines = outliers.map(
    (chapter) =>
      `- "${chapter.title}": ${chapter.sentenceCount} narrative sentences (target ${preset.minSentencesPerChapter}–${preset.maxSentencesPerChapter}; acceptable ${preset.softMinSentencesPerChapter}–${preset.softMaxSentencesPerChapter})`,
  );

  return [
    "LENGTH CORRECTION (mandatory):",
    `Every chapter's paragraph blocks together must contain approximately ${preset.minSentencesPerChapter}–${preset.maxSentencesPerChapter} sentences.`,
    "Do not change the number of chapters to fix length — adjust prose depth only.",
    "These chapters were outside the acceptable range on the previous attempt:",
    ...lines,
    "Rewrite so every chapter stays close to the target sentence range while preserving story quality and coherence.",
  ].join("\n");
}
