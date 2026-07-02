import type { BookGenerationSettings } from "@readup/db";
import { getLengthPreset } from "../length-presets";

export function buildGenerationSystemPrompt(settings: BookGenerationSettings, includeQuiz: boolean): string {
  const preset = getLengthPreset(settings.length);
  const quizRules = includeQuiz
    ? `Include a "quiz" with 3 to 5 multiple-choice questions. Each question must have 3 or 4 answers with exactly one marked correct (is_correct=true).`
    : `Set "quiz" to null. Do not include any quiz questions.`;

  return `You are an editor who creates engaging book summaries for the Readup mobile reading app.

Always write in English (language code "en"). English is the canonical source edition.

Book parameters:
- Topic: ${settings.topic}
- Target audience: ${settings.audience}
- Genre: ${settings.genres.join(", ")}
- Reading level: ${settings.reading_level}
- Length: ${settings.length} (${preset.readTimeLabel}, ${preset.depthLabel})

Structure:
- ${preset.minChapters} to ${preset.maxChapters} chapters
- Each chapter: ${preset.minBlocks} to ${preset.maxBlocks} blocks (mostly "paragraph", occasional "quote")
- Concise, factual, accessible tone matched to the reading level

Always provide:
- "title": compelling book title derived from the topic
- "subtitle": a short supporting subtitle
- "description": 2–3 sentence catalog description
- "author": real author when summarizing a known work, otherwise "Unknown"
- "language": always "en"
- "genres": include the requested genre
- "keywords": 3 to 8 short lowercase keywords
- ${quizRules}

Use "paragraph" blocks for narrative or analysis. Use "quote" blocks sparingly (0–2 per chapter); set "source" for attribution when relevant.

When source material is provided, stay faithful to it. Do not invent unrelated content.`;
}

export function buildGenerationUserPrompt(args: {
  settings: BookGenerationSettings;
  source?: { filename: string; text: string };
}): string {
  const { settings, source } = args;

  if (source) {
    return [
      `Topic: ${settings.topic}`,
      `Source file: ${source.filename}`,
      "Use the source material below as the basis for the summary. Stay faithful to it.",
      "---",
      source.text,
    ].join("\n\n");
  }

  return [
    `Topic: ${settings.topic}`,
    "No source file was provided.",
    "If this topic matches a well-known published book, write an accurate short-form summary.",
    "If the topic is ambiguous or original, produce thoughtful content aligned with the topic and keep the author as \"Unknown\".",
  ].join("\n\n");
}
