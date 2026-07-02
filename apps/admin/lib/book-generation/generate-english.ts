import "server-only";

import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { BOOK_GENRES } from "@/lib/book-genres";
import { parseBookContentInput, type BookContentInput } from "@/lib/book-content";
import type { BookGenerationSettings } from "@readup/db";
import { getLengthPreset } from "./length-presets";
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

  return z.object({
    title: z.string().min(1),
    subtitle: z.string().min(1),
    description: z.string().min(1),
    author: z.string().min(1),
    language: z.literal(SOURCE_LANGUAGE),
    genres: z.array(z.enum(BOOK_GENRES)).min(1).max(5),
    keywords: z.array(z.string().min(1)).max(8),
    chapters: z
      .array(
        z.object({
          title: z.string().min(1),
          blocks: z
            .array(generationBlockSchema)
            .min(preset.minBlocks)
            .max(preset.maxBlocks),
        }),
      )
      .min(preset.minChapters)
      .max(preset.maxChapters),
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

function toBookContentInput(
  draft: z.infer<ReturnType<typeof buildGenerationBookSchema>>,
  includeQuiz: boolean,
): GeneratedEnglishDraft {
  const content: BookContentInput = {
    title: draft.title,
    author: draft.author,
    language: SOURCE_LANGUAGE,
    genres: draft.genres,
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

export async function generateEnglishBook(
  options: GenerateEnglishOptions,
): Promise<GeneratedEnglishDraft> {
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
    }),
    temperature: 0.6,
  });

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
      audience: "general readers",
      genres: ["other"],
      reading_level: "intermediate",
      length: "medium",
      quiz_enabled: true,
    },
    includeQuiz: true,
    source: args.source,
  });
  return result.content;
}
