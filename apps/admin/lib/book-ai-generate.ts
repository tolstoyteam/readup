import "server-only";

import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { BOOK_GENRES } from "@/lib/book-genres";
import { LANGUAGE_OPTIONS } from "@/lib/book-language";
import {
  parseBookContentInput,
  type BookContentInput,
} from "@/lib/book-content";

const SUPPORTED_LANGUAGES = LANGUAGE_OPTIONS.map((option) => option.value) as [
  string,
  ...string[],
];

const generationBlockSchema = z.object({
  type: z.enum(["paragraph", "quote"]),
  text: z.string().min(1),
  source: z
    .string()
    .nullable()
    .describe('Speaker or attribution; only set when type is "quote".'),
});

const generationChapterSchema = z.object({
  title: z.string().min(1),
  blocks: z.array(generationBlockSchema).min(2),
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

const generationBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  language: z.enum(SUPPORTED_LANGUAGES),
  genres: z.array(z.enum(BOOK_GENRES)).min(1).max(5),
  keywords: z.array(z.string().min(1)).max(8),
  chapters: z.array(generationChapterSchema).min(4).max(8),
  quiz: generationQuizSchema.nullable(),
});

export type GeneratedBookDraft = z.infer<typeof generationBookSchema>;

type GenerateOptions = {
  title: string;
  source?: {
    filename: string;
    text: string;
  };
};

const DEFAULT_MODEL = process.env.BOOK_AI_MODEL ?? "gpt-4o-mini";

const SYSTEM_PROMPT = `You are an editor who creates short, engaging book summaries for the Readup mobile reading app.

Each book is a 10-15 minute read split into 4 to 8 chapters of mostly paragraph blocks with the occasional quote block. The tone is concise, factual, and accessible.

Always:
- Pick the most accurate "language" code from this list: ${SUPPORTED_LANGUAGES.join(", ")}.
- Choose 1 to 5 "genres" from the provided enum that best describe the book.
- Provide 3 to 8 short, lowercase "keywords" reflecting the book's main ideas.
- Author: use the real author's name when summarizing a known book. If you are not certain, fall back to "Unknown".
- Chapters: include a clear title and 2 to 6 blocks. Use "paragraph" blocks for narrative or analysis. Use "quote" blocks sparingly (0-2 per chapter) for memorable lines; set "source" to the speaker or attribution when relevant, otherwise null.
- Quiz: include a "quiz" only when there is enough substance to support 3-5 multiple-choice questions. Each question must have 3 or 4 answers with exactly one marked correct (is_correct=true). When you cannot produce a strong quiz, set "quiz" to null.

Stay grounded: when the user provides source material, summarize that material instead of inventing unrelated content.`;

function buildUserPrompt({ title, source }: GenerateOptions): string {
  if (source) {
    return [
      `Book title (from the user): ${title}`,
      `Source file: ${source.filename}`,
      "Use the source material below as the basis for the summary. Stay faithful to it. If the source text is incomplete, summarize what is available.",
      "---",
      source.text,
    ].join("\n\n");
  }

  return [
    `Book title (from the user): ${title}`,
    "No source file was provided. If this is a well-known published book, write an accurate short-form summary based on the original work. If the title is ambiguous or unknown, produce a thoughtful generic summary aligned with the title while keeping the author as \"Unknown\".",
  ].join("\n\n");
}

function toBookContentInputDraft(draft: GeneratedBookDraft): BookContentInput {
  return {
    title: draft.title,
    author: draft.author,
    language: draft.language,
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
    quiz: draft.quiz
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
  } as BookContentInput;
}

export async function generateBookContent(
  options: GenerateOptions,
): Promise<BookContentInput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Set it in your environment to use AI generation.",
    );
  }

  const provider = createOpenAI({ apiKey });

  const { object } = await generateObject({
    model: provider(DEFAULT_MODEL),
    schema: generationBookSchema,
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(options),
    temperature: 0.6,
  });

  const draft = toBookContentInputDraft(object);
  const parsed = parseBookContentInput(draft);
  if (!parsed.ok) {
    throw new Error(`Generated book failed validation: ${parsed.message}`);
  }
  return parsed.data;
}
