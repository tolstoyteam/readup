import { BOOK_GENRES, type BookGenerationSettings } from "@readup/db";
import { getLengthPreset } from "../length-presets";

export function buildGenerationSystemPrompt(settings: BookGenerationSettings, includeQuiz: boolean): string {
  const preset = getLengthPreset(settings.length);
  const supportedGenres = BOOK_GENRES.join(", ");
  const quizRules = includeQuiz
    ? `Include a "quiz" with 3 to 5 multiple-choice questions. Each question must have 3 or 4 answers with exactly one marked correct (is_correct=true).`
    : `Set "quiz" to null. Do not include any quiz questions.`;

  return `You are an editor who creates engaging book summaries for the Readup mobile reading app.

Always write in English (language code "en"). English is the canonical source edition.

Book parameters:
- Topic: ${settings.topic}
- Reading level: ${settings.reading_level}
- Length setting: ${settings.length} (this controls sentences per chapter — see Chapter length below)
- Quiz: ${includeQuiz ? "enabled" : "disabled"}

Structure:
- ${preset.minChapters} to ${preset.maxChapters} chapters (chapter count is the same for short, medium, and long — do not add or remove chapters based on length)
- Each chapter: ${preset.minBlocks} to ${preset.maxBlocks} blocks (mostly "paragraph", plus "quote" when appropriate)
- Tone matched to the reading level

Chapter length (CRITICAL — applies to EVERY chapter):
- Selected option: ${settings.length}
- ${preset.chapterLengthGuidance}
- HARD REQUIREMENT: the combined text of all "paragraph" blocks in each chapter MUST contain between ${preset.minSentencesPerChapter} and ${preset.maxSentencesPerChapter} sentences.
- Do not write fewer than ${preset.minSentencesPerChapter} narrative sentences in any chapter.
- Do not write more than ${preset.maxSentencesPerChapter} narrative sentences in any chapter.
- Count sentences across all paragraph blocks in the chapter combined (not per block).
- Quote blocks do NOT count toward the sentence target.
- Apply this range to every chapter equally — not only the first. Length controls chapter prose depth, not the number of chapters.
- Short ≠ fewer chapters; Long ≠ more chapters. Only sentence count per chapter changes.

Always provide:
- "title": compelling book title derived from the topic
- "subtitle": a short supporting subtitle
- "description": 2–3 sentence catalog description
- "author": real author when summarizing a known work, otherwise "Unknown"
- "language": always "en"
- "genres": return an array with exactly one genre slug from this supported list: ${supportedGenres}. Infer the closest match from the topic, reading level, length, quiz setting, and source material when provided. Do not invent arbitrary genre names; if uncertain, choose the closest supported genre, using "other" only when no better match fits.
- "keywords": 3 to 8 short lowercase keywords
- ${quizRules}

Use "paragraph" blocks for narrative or analysis. Prefer fewer longer paragraphs over many one-sentence blocks when needed to hit the sentence target.

Quotes:
- When a chapter contains memorable, emotional, inspirational, humorous, or otherwise meaningful dialogue or narration, include 1–2 "quote" blocks.
- Prefer extracting wording that already appears (or closely mirrors wording) in that chapter's paragraph content — do not fabricate unrelated epigraphs.
- Set "source" for attribution when relevant (speaker, character, or work).
- If a chapter genuinely has no quote-worthy content, omit quote blocks for that chapter.

When source material is provided, stay faithful to it. Do not invent unrelated content.

FINAL CHECK before responding: for each chapter, count the sentences in paragraph blocks and confirm each chapter is within ${preset.minSentencesPerChapter}–${preset.maxSentencesPerChapter}.`;
}

export function buildGenerationUserPrompt(args: {
  settings: BookGenerationSettings;
  source?: { filename: string; text: string };
  lengthCorrectionAddendum?: string;
}): string {
  const { settings, source, lengthCorrectionAddendum } = args;
  const preset = getLengthPreset(settings.length);

  const parts: string[] = [];

  if (source) {
    parts.push(
      `Topic: ${settings.topic}`,
      `Source file: ${source.filename}`,
      "Use the source material below as the basis for the summary. Stay faithful to it.",
      "---",
      source.text,
    );
  } else {
    parts.push(
      `Topic: ${settings.topic}`,
      "No source file was provided.",
      "If this topic matches a well-known published book, write an accurate short-form summary.",
      'If the topic is ambiguous or original, produce thoughtful content aligned with the topic and keep the author as "Unknown".',
    );
  }

  parts.push(
    [
      `Length reminder: write every chapter with ${preset.minSentencesPerChapter}–${preset.maxSentencesPerChapter} narrative sentences (${settings.length}).`,
      "Keep 4–6 chapters for all length options; only chapter prose depth changes.",
    ].join(" "),
  );

  if (lengthCorrectionAddendum) {
    parts.push(lengthCorrectionAddendum);
  }

  return parts.join("\n\n");
}
