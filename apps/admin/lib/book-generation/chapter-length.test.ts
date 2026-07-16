import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  analyzeChapterSentenceLengths,
  buildLengthCorrectionAddendum,
  chaptersOutsideSoftRange,
  countSentences,
} from "./chapter-length";
import {
  SHARED_MAX_CHAPTERS,
  SHARED_MIN_CHAPTERS,
  getLengthPreset,
} from "./length-presets";
import { buildGenerationSystemPrompt } from "./prompts/generation";
import type { BookGenerationSettings } from "@readup/db";

describe("getLengthPreset", () => {
  it("uses shared chapter bounds for every length", () => {
    for (const length of ["short", "medium", "long"] as const) {
      const preset = getLengthPreset(length);
      assert.equal(preset.minChapters, SHARED_MIN_CHAPTERS);
      assert.equal(preset.maxChapters, SHARED_MAX_CHAPTERS);
    }
  });

  it("defines the required sentence ranges", () => {
    assert.deepEqual(
      [
        getLengthPreset("short").minSentencesPerChapter,
        getLengthPreset("short").maxSentencesPerChapter,
      ],
      [3, 5],
    );
    assert.deepEqual(
      [
        getLengthPreset("medium").minSentencesPerChapter,
        getLengthPreset("medium").maxSentencesPerChapter,
      ],
      [5, 7],
    );
    assert.deepEqual(
      [
        getLengthPreset("long").minSentencesPerChapter,
        getLengthPreset("long").maxSentencesPerChapter,
      ],
      [8, 11],
    );
  });
});

describe("countSentences", () => {
  it("returns 0 for empty text", () => {
    assert.equal(countSentences(""), 0);
    assert.equal(countSentences("   "), 0);
  });

  it("counts multiple sentences", () => {
    assert.equal(
      countSentences("One sentence. Two sentences! Three questions?"),
      3,
    );
  });

  it("treats trailing text without punctuation as a sentence", () => {
    assert.equal(countSentences("Hello there"), 1);
    assert.equal(countSentences("Hello there. And more"), 2);
  });

  it("does not split on common abbreviations", () => {
    assert.equal(countSentences("Dr. Smith went home. He rested."), 2);
    assert.equal(countSentences("See e.g. the notes. Done."), 2);
  });

  it("does not split decimal numbers", () => {
    assert.equal(countSentences("The value was 3.14 exactly. Next."), 2);
  });
});

describe("chapter sentence analysis", () => {
  const preset = getLengthPreset("short");

  it("counts only paragraph blocks toward the narrative total", () => {
    const chapters = [
      {
        title: "Intro",
        blocks: [
          { type: "paragraph", text: "First. Second. Third." },
          { type: "quote", text: "A memorable line. Another quote sentence." },
          { type: "paragraph", text: "Fourth. Fifth." },
        ],
      },
    ];

    const info = analyzeChapterSentenceLengths(chapters, preset);
    assert.equal(info[0]?.sentenceCount, 5);
    assert.equal(info[0]?.inSoftRange, true);
  });

  it("flags chapters outside the soft range", () => {
    const chapters = [
      {
        title: "Too short",
        blocks: [{ type: "paragraph", text: "Only one." }],
      },
      {
        title: "Ok",
        blocks: [
          {
            type: "paragraph",
            text: "One. Two. Three. Four.",
          },
        ],
      },
    ];

    const outliers = chaptersOutsideSoftRange(chapters, preset);
    assert.equal(outliers.length, 1);
    assert.equal(outliers[0]?.title, "Too short");
  });

  it("builds a correction addendum listing outliers", () => {
    const addendum = buildLengthCorrectionAddendum(
      [{ title: "Too short", sentenceCount: 1, inSoftRange: false }],
      preset,
    );
    assert.match(addendum, /LENGTH CORRECTION/);
    assert.match(addendum, /Too short/);
    assert.match(addendum, /3–5/);
  });
});

describe("buildGenerationSystemPrompt", () => {
  const baseSettings: BookGenerationSettings = {
    topic: "Atomic Habits",
    genres: [],
    reading_level: "intermediate",
    length: "medium",
    quiz_enabled: true,
  };

  it("includes sentence guidance for the selected length", () => {
    for (const length of ["short", "medium", "long"] as const) {
      const preset = getLengthPreset(length);
      const prompt = buildGenerationSystemPrompt(
        { ...baseSettings, length },
        true,
      );
      assert.match(prompt, new RegExp(`${preset.minSentencesPerChapter}–${preset.maxSentencesPerChapter}`));
      assert.match(prompt, /Chapter length \(CRITICAL/i);
      assert.match(prompt, /do not add or remove chapters based on length/i);
      assert.match(prompt, /HARD REQUIREMENT/);
      assert.match(prompt, /memorable, emotional, inspirational/);
    }
  });

  it("uses shared chapter counts in the structure section", () => {
    const prompt = buildGenerationSystemPrompt(baseSettings, false);
    assert.match(
      prompt,
      new RegExp(`${SHARED_MIN_CHAPTERS} to ${SHARED_MAX_CHAPTERS} chapters`),
    );
    assert.match(prompt, /Set "quiz" to null/);
  });
});
