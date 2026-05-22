import { z } from "zod";
import { BOOK_GENRES } from "@/lib/book-genres";

const trimmedString = z.string().trim();
const requiredText = trimmedString.min(1);

export const paragraphBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal("paragraph"),
  content: z.object({
    text: requiredText,
  }),
});

export const quoteBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal("quote"),
  content: z.object({
    text: requiredText,
    source: trimmedString.optional().transform((value) => value || undefined),
  }),
});

export const chapterBlockSchema = z.discriminatedUnion("type", [
  paragraphBlockSchema,
  quoteBlockSchema,
]);

export const chapterSchema = z.object({
  id: z.string().optional(),
  title: requiredText,
  blocks: z.array(chapterBlockSchema).min(1),
});

export const quizAnswerSchema = z.object({
  id: z.string().optional(),
  text: requiredText,
  is_correct: z.boolean(),
});

export const quizQuestionSchema = z.object({
  id: z.string().optional(),
  question: requiredText,
  answers: z.array(quizAnswerSchema).min(2),
});

export const quizSchema = z.object({
  questions: z.array(quizQuestionSchema).min(3).max(5),
});

export const bookContentInputSchema = z.object({
  title: requiredText,
  author: requiredText,
  language: requiredText,
  genres: z.array(z.enum(BOOK_GENRES)).max(5),
  keywords: z.array(requiredText).default([]),
  cover_image_url: trimmedString.nullish().transform((value) => value || undefined),
  chapters: z.array(chapterSchema).min(1),
  quiz: quizSchema.nullish().transform((value) => value ?? undefined),
}).superRefine((value, ctx) => {
  if (!value.quiz) return;

  value.quiz.questions.forEach((question, questionIndex) => {
    if (!question.answers.some((answer) => answer.is_correct)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quiz", "questions", questionIndex, "answers"],
        message: "Each quiz question needs at least one correct answer.",
      });
    }
  });
});

export type BookContentInput = z.infer<typeof bookContentInputSchema>;
export type ChapterInput = z.infer<typeof chapterSchema>;
export type ChapterBlockInput = z.infer<typeof chapterBlockSchema>;
export type QuizInput = z.infer<typeof quizSchema>;
export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>;
export type QuizAnswerInput = z.infer<typeof quizAnswerSchema>;

export function parseBookContentInput(input: unknown):
  | { ok: true; data: BookContentInput }
  | { ok: false; message: string } {
  const parsed = bookContentInputSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }

  const first = parsed.error.issues[0];
  return {
    ok: false,
    message: first ? `${first.path.join(".") || "book"}: ${first.message}` : "Invalid book payload",
  };
}
