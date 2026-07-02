import "server-only";

import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { parseBookContentInput, type BookContentInput } from "@/lib/book-content";
import type { BookWithContent } from "@/lib/book-relational";

const translatedBlockSchema = z.object({
  stable_id: z.string().uuid(),
  type: z.enum(["paragraph", "quote"]),
  text: z.string().min(1),
  source: z.string().nullable(),
});

const translatedChapterSchema = z.object({
  stable_id: z.string().uuid(),
  title: z.string().min(1),
  blocks: z.array(translatedBlockSchema).min(1),
});

const translatedAnswerSchema = z.object({
  text: z.string().min(1),
  is_correct: z.boolean(),
});

const translatedQuestionSchema = z.object({
  question: z.string().min(1),
  answers: z.array(translatedAnswerSchema).min(2),
});

const translatedBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  language: z.string().min(1),
  keywords: z.array(z.string().min(1)),
  chapters: z.array(translatedChapterSchema).min(1),
  quiz: z
    .object({
      questions: z.array(translatedQuestionSchema).min(3).max(5),
    })
    .nullable(),
});

const DEFAULT_MODEL = process.env.BOOK_TRANSLATION_MODEL ?? process.env.BOOK_AI_MODEL ?? "gpt-4o-mini";

const SYSTEM_PROMPT = `You are a professional literary translator for the Readup reading app.

Translate faithfully into the target language. Preserve meaning, tone, readability, paragraph boundaries, markdown, formatting, emphasis, lists, quotes, chapter count, chapter order, block count, block order, quiz question order, and answer order.

Do not summarize, reinterpret, add chapters, remove chapters, merge blocks, split blocks, reorder answers, or change which answer is correct. Always include every requested field; if there are no keywords, return an empty keywords array. Return a translation only.`;

function sourcePayload(book: BookWithContent) {
  return {
    title: book.title,
    author: book.author,
    language: book.language,
    keywords: book.keywords,
    chapters: book.chapters.map((chapter) => ({
      stable_id: chapter.stableId,
      title: chapter.title,
      blocks: chapter.blocks.map((block) => ({
        stable_id: block.stableId,
        type: block.type,
        text: block.content.text,
        source: "source" in block.content ? block.content.source ?? null : null,
      })),
    })),
    quiz: book.quiz
      ? {
          questions: book.quiz.questions.map((question) => ({
            question: question.question,
            answers: question.answers.map((answer) => ({
              text: answer.text,
              is_correct: answer.isCorrect,
            })),
          })),
        }
      : null,
  };
}

function toBookContentInput(
  source: BookWithContent,
  targetLanguage: string,
  translated: z.infer<typeof translatedBookSchema>,
): BookContentInput {
  return {
    title: translated.title,
    author: translated.author,
    language: targetLanguage,
    genres: source.genres as BookContentInput["genres"],
    keywords: translated.keywords,
    cover_image_url: source.coverImageUrl ?? undefined,
    chapters: translated.chapters.map((chapter) => ({
      id: chapter.stable_id,
      title: chapter.title,
      blocks: chapter.blocks.map((block) =>
        block.type === "quote"
          ? {
              id: block.stable_id,
              type: "quote" as const,
              content: {
                text: block.text,
                source: block.source ?? undefined,
              },
            }
          : {
              id: block.stable_id,
              type: "paragraph" as const,
              content: { text: block.text },
            },
      ),
    })),
    quiz: translated.quiz
      ? {
          questions: translated.quiz.questions.map((question) => ({
            question: question.question,
            answers: question.answers.map((answer) => ({
              text: answer.text,
              is_correct: answer.is_correct,
            })),
          })),
        }
      : undefined,
  };
}

function validateAligned(
  source: BookWithContent,
  translated: z.infer<typeof translatedBookSchema>,
): void {
  if (translated.chapters.length !== source.chapters.length) {
    throw new Error("Translation changed the chapter count.");
  }

  source.chapters.forEach((sourceChapter, chapterIndex) => {
    const translatedChapter = translated.chapters[chapterIndex];
    if (!translatedChapter || translatedChapter.stable_id !== sourceChapter.stableId) {
      throw new Error(`Translation changed chapter alignment at index ${chapterIndex + 1}.`);
    }
    if (translatedChapter.blocks.length !== sourceChapter.blocks.length) {
      throw new Error(`Translation changed block count in chapter ${chapterIndex + 1}.`);
    }
    sourceChapter.blocks.forEach((sourceBlock, blockIndex) => {
      const translatedBlock = translatedChapter.blocks[blockIndex];
      if (!translatedBlock || translatedBlock.stable_id !== sourceBlock.stableId) {
        throw new Error(`Translation changed block alignment at chapter ${chapterIndex + 1}, block ${blockIndex + 1}.`);
      }
      if (translatedBlock.type !== sourceBlock.type) {
        throw new Error(`Translation changed block type at chapter ${chapterIndex + 1}, block ${blockIndex + 1}.`);
      }
    });
  });

  const sourceQuestions = source.quiz?.questions ?? [];
  const translatedQuestions = translated.quiz?.questions ?? [];
  if (sourceQuestions.length !== translatedQuestions.length) {
    throw new Error("Translation changed the quiz question count.");
  }
  sourceQuestions.forEach((question, questionIndex) => {
    const translatedQuestion = translatedQuestions[questionIndex];
    if (!translatedQuestion || translatedQuestion.answers.length !== question.answers.length) {
      throw new Error(`Translation changed answer count for quiz question ${questionIndex + 1}.`);
    }
    question.answers.forEach((answer, answerIndex) => {
      if (translatedQuestion.answers[answerIndex]?.is_correct !== answer.isCorrect) {
        throw new Error(`Translation changed the correct answer at quiz question ${questionIndex + 1}.`);
      }
    });
  });
}

export async function translateBookEdition(args: {
  source: BookWithContent;
  targetLanguage: string;
}): Promise<BookContentInput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured. Set it to use AI translation.");
  }

  const provider = createOpenAI({ apiKey });
  const { object } = await generateObject({
    model: provider(DEFAULT_MODEL),
    schema: translatedBookSchema,
    system: SYSTEM_PROMPT,
    prompt: [
      `Target language: ${args.targetLanguage}`,
      "Translate this complete edition. Preserve every stable_id exactly.",
      JSON.stringify(sourcePayload(args.source), null, 2),
    ].join("\n\n"),
    temperature: 0.2,
  });

  validateAligned(args.source, object);
  const draft = toBookContentInput(args.source, args.targetLanguage, object);
  const parsed = parseBookContentInput(draft);
  if (!parsed.ok) {
    throw new Error(`Translated book failed validation: ${parsed.message}`);
  }
  return parsed.data;
}
