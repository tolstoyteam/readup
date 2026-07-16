import type { BookLength } from "@readup/db";

/** Shared chapter count for all lengths — length controls prose depth, not book structure. */
export const SHARED_MIN_CHAPTERS = 4;
export const SHARED_MAX_CHAPTERS = 6;

export type LengthPreset = {
  minChapters: number;
  maxChapters: number;
  minBlocks: number;
  maxBlocks: number;
  /** Target narrative sentences per chapter (paragraph blocks only). */
  minSentencesPerChapter: number;
  maxSentencesPerChapter: number;
  /**
   * Soft tolerance for post-generation checks (inclusive).
   * Outside this band triggers one regeneration pass.
   */
  softMinSentencesPerChapter: number;
  softMaxSentencesPerChapter: number;
  /** One-line operator-facing hint. */
  uiHint: string;
  /** Prompt guidance for chapter prose depth. */
  chapterLengthGuidance: string;
};

const PRESETS: Record<BookLength, LengthPreset> = {
  short: {
    minChapters: SHARED_MIN_CHAPTERS,
    maxChapters: SHARED_MAX_CHAPTERS,
    minBlocks: 1,
    maxBlocks: 3,
    minSentencesPerChapter: 3,
    maxSentencesPerChapter: 5,
    softMinSentencesPerChapter: 2,
    softMaxSentencesPerChapter: 6,
    uiHint: "About 3–5 sentences per chapter — concise but complete.",
    chapterLengthGuidance:
      "Approximately 3–5 sentences per chapter. Keep the writing concise while maintaining a complete narrative. Vary sentence length naturally.",
  },
  medium: {
    minChapters: SHARED_MIN_CHAPTERS,
    maxChapters: SHARED_MAX_CHAPTERS,
    minBlocks: 2,
    maxBlocks: 4,
    minSentencesPerChapter: 5,
    maxSentencesPerChapter: 7,
    softMinSentencesPerChapter: 4,
    softMaxSentencesPerChapter: 8,
    uiHint: "About 5–7 sentences per chapter — moderate detail and smooth transitions.",
    chapterLengthGuidance:
      "Approximately 5–7 sentences per chapter. Include moderate detail and smooth transitions. Vary sentence length naturally.",
  },
  long: {
    minChapters: SHARED_MIN_CHAPTERS,
    maxChapters: SHARED_MAX_CHAPTERS,
    minBlocks: 2,
    maxBlocks: 5,
    minSentencesPerChapter: 8,
    maxSentencesPerChapter: 11,
    softMinSentencesPerChapter: 7,
    softMaxSentencesPerChapter: 12,
    uiHint: "About 8–11 sentences per chapter — richer description and storytelling.",
    chapterLengthGuidance:
      "Approximately 8–11 sentences per chapter. Provide richer descriptions, dialogue where appropriate, and more detailed storytelling. Vary sentence length naturally.",
  },
};

export function getLengthPreset(length: BookLength): LengthPreset {
  return PRESETS[length];
}
