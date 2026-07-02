import type { BookLength } from "./types";

export type LengthPreset = {
  minChapters: number;
  maxChapters: number;
  minBlocks: number;
  maxBlocks: number;
  readTimeLabel: string;
  depthLabel: string;
};

const PRESETS: Record<BookLength, LengthPreset> = {
  short: {
    minChapters: 3,
    maxChapters: 4,
    minBlocks: 2,
    maxBlocks: 3,
    readTimeLabel: "5–8 minutes",
    depthLabel: "concise summaries with fewer chapters and shorter explanations",
  },
  medium: {
    minChapters: 4,
    maxChapters: 6,
    minBlocks: 2,
    maxBlocks: 5,
    readTimeLabel: "10–15 minutes",
    depthLabel: "balanced depth with a standard amount of content",
  },
  long: {
    minChapters: 7,
    maxChapters: 10,
    minBlocks: 4,
    maxBlocks: 8,
    readTimeLabel: "20–30 minutes",
    depthLabel:
      "significantly more chapters, deeper explanations, more examples, and richer detail",
  },
};

export function getLengthPreset(length: BookLength): LengthPreset {
  return PRESETS[length];
}
