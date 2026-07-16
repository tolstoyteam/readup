import "server-only";

import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { BOOK_GENRES } from "@/lib/book-genres";
import { parseBookContentInput, type BookContentInput } from "@/lib/book-content";
import type { BookGenerationSettings } from "@readup/db";
import { getLengthPreset } from "./length-presets";
import {
  buildLengthCorrectionAddendum,
  chaptersOutsideSoftRange,
} from "./chapter-length";
import {
  buildGenerationSystemPrompt,
  buildGenerationUserPrompt,
} from "./prompts/generation";
import { assignStableIds } from "./stable-ids";
import { SOURCE_LANGUAGE } from "./constants";
import type { GeneratedEnglishDraft } from "./types";

const DEFAULT_MODEL = process.env.BOOK_AI_MODEL ?? "gpt-4o-mini";

const generationBlockSchema = z.object({
  type: z.enum(["paragraph", "quote"]),
  text: z.string().min(1),
  source: z
    .string()
    .nullable()
    .describe('Speaker or attribution; only set when type is "quote".'),
});

const generationAnswerSchema = z.object({
  text: z.string().min(1),
  is_correct: z.boolean(),
});

const generationQuestionSchema = z.object({
  question: z.string().min(1),
  answers: z.array(generationAnswerSchema).min(3).max(4),
});

const generationQuizSchema = z.object({
  questions: z.array(generationQuestionSchema).min(3).max(5),
});

function buildGenerationBookSchema(settings: BookGenerationSettings, includeQuiz: boolean) {
  const preset = getLengthPreset(settings.length);
  const quizField = includeQuiz
    ? { quiz: generationQuizSchema }
    : { quiz: z.null() };

  const sentenceDescribe = `Each chapter's paragraph blocks combined should contain approximately ${preset.minSentencesPerChapter}–${preset.maxSentencesPerChapter} sentences (${settings.length} length). Quote blocks do not count toward this total.`;

  return z.object({
    title: z.string().min(1),
    subtitle: z.string().min(1),
    description: z.string().min(1),
    author: z.string().min(1),
    language: z.literal(SOURCE_LANGUAGE),
    genres: z.array(z.enum(BOOK_GENRES)).length(1),
    keywords: z.array(z.string().min(1)).max(8),
    chapters: z
      .array(
        z.object({
          title: z.string().min(1),
          blocks: z
            .array(generationBlockSchema)
            .min(preset.minBlocks)
            .max(preset.maxBlocks)
            .describe(sentenceDescribe),
        }),
      )
      .min(preset.minChapters)
      .max(preset.maxChapters)
      .describe(
        `${preset.minChapters}–${preset.maxChapters} chapters. ${sentenceDescribe} Apply the sentence target to every chapter.`,
      ),
    ...quizField,
  });
}

type GenerateEnglishOptions = {
  settings: BookGenerationSettings;
  includeQuiz: boolean;
  source?: {
    filename: string;
    text: string;
  };
};

type RawGeneratedBook = z.infer<ReturnType<typeof buildGenerationBookSchema>>;

function toBookContentInput(
  draft: RawGeneratedBook,
  includeQuiz: boolean,
): GeneratedEnglishDraft {
  const genres = draft.genres.length === 1 ? draft.genres : ["other" as const];
  const content: BookContentInput = {
    title: draft.title,
    author: draft.author,
    language: SOURCE_LANGUAGE,
    genres,
    keywords: draft.keywords ?? [],
    cover_image_url: undefined,
    chapters: draft.chapters.map((chapter) => ({
      title: chapter.title,
      blocks: chapter.blocks.map((block) =>
        block.type === "quote"
          ? {
              type: "quote" as const,
              content: {
                text: block.text,
                source: block.source ?? undefined,
              },
            }
          : {
              type: "paragraph" as const,
              content: { text: block.text },
            },
      ),
    })),
    quiz:
      includeQuiz && draft.quiz
        ? {
            questions: draft.quiz.questions.map((question) => ({
              question: question.question,
              answers: question.answers.map((answer) => ({
                text: answer.text,
                is_correct: answer.is_correct,
              })),
            })),
          }
        : undefined,
  };

  return {
    content: assignStableIds(content),
    subtitle: draft.subtitle,
    description: draft.description,
  };
}

async function generateRawBook(
  options: GenerateEnglishOptions,
  lengthCorrectionAddendum?: string,
): Promise<RawGeneratedBook> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Set it in your environment to use AI generation.",
    );
  }

  const schema = buildGenerationBookSchema(options.settings, options.includeQuiz);
  const provider = createOpenAI({ apiKey });

  const { object } = await generateObject({
    model: provider(DEFAULT_MODEL),
    schema,
    system: buildGenerationSystemPrompt(options.settings, options.includeQuiz),
    prompt: buildGenerationUserPrompt({
      settings: options.settings,
      source: options.source,
      lengthCorrectionAddendum,
    }),
    temperature: 0.6,
  });

  return object;
}

export async function generateEnglishBook(
  options: GenerateEnglishOptions,
): Promise<GeneratedEnglishDraft> {
  const preset = getLengthPreset(options.settings.length);
  let object = await generateRawBook(options);

  const outliers = chaptersOutsideSoftRange(object.chapters, preset);
  if (outliers.length > 0) {
    const correction = buildLengthCorrectionAddendum(outliers, preset);
    object = await generateRawBook(options, correction);
  }

  const draft = toBookContentInput(object, options.includeQuiz);
  const parsed = parseBookContentInput(draft.content);
  if (!parsed.ok) {
    throw new Error(`Generated book failed validation: ${parsed.message}`);
  }

  return {
    ...draft,
    content: parsed.data,
  };
}

/** Backward-compatible entry for draft-only generation from a title string. */
export async function generateBookContentFromTitle(args: {
  title: string;
  source?: { filename: string; text: string };
}): Promise<BookContentInput> {
  const result = await generateEnglishBook({
    settings: {
      topic: args.title,
      genres: [],
      reading_level: "intermediate",
      length: "medium",
      quiz_enabled: true,
    },
    includeQuiz: true,
    source: args.source,
  });
  return result.content;
}
