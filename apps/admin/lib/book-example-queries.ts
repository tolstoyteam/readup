import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  bookGenresTable,
  booksTable,
  chapterBlocksTable,
  chaptersTable,
  genresTable,
  quizAnswersTable,
  quizQuestionsTable,
  quizzesTable,
} from "@readup/db";

/**
 * Example query: load ordered chapters and blocks for a reader surface.
 */
export async function exampleBookBlocksQuery(bookId: number) {
  return db
    .select({
      bookId: booksTable.id,
      title: booksTable.title,
      chapterId: chaptersTable.id,
      chapterTitle: chaptersTable.title,
      chapterOrder: chaptersTable.orderIndex,
      blockId: chapterBlocksTable.id,
      blockType: chapterBlocksTable.type,
      blockContent: chapterBlocksTable.content,
      blockOrder: chapterBlocksTable.orderIndex,
    })
    .from(booksTable)
    .innerJoin(chaptersTable, eq(chaptersTable.bookId, booksTable.id))
    .innerJoin(chapterBlocksTable, eq(chapterBlocksTable.chapterId, chaptersTable.id))
    .where(eq(booksTable.id, bookId))
    .orderBy(asc(chaptersTable.orderIndex), asc(chapterBlocksTable.orderIndex));
}

/**
 * Example query: list a book's normalized genres.
 */
export async function exampleBookGenresQuery(bookId: number) {
  return db
    .select({ genre: genresTable.name })
    .from(bookGenresTable)
    .innerJoin(genresTable, eq(genresTable.id, bookGenresTable.genreId))
    .where(eq(bookGenresTable.bookId, bookId))
    .orderBy(asc(genresTable.name));
}

/**
 * Example query: load optional quiz rows. No rows means the book has no quiz.
 */
export async function exampleQuizQuery(bookId: number) {
  return db
    .select({
      quizId: quizzesTable.id,
      questionId: quizQuestionsTable.id,
      question: quizQuestionsTable.question,
      questionOrder: quizQuestionsTable.orderIndex,
      answerId: quizAnswersTable.id,
      answer: quizAnswersTable.text,
      isCorrect: quizAnswersTable.isCorrect,
    })
    .from(quizzesTable)
    .innerJoin(quizQuestionsTable, eq(quizQuestionsTable.quizId, quizzesTable.id))
    .innerJoin(quizAnswersTable, eq(quizAnswersTable.questionId, quizQuestionsTable.id))
    .where(eq(quizzesTable.bookId, bookId))
    .orderBy(asc(quizQuestionsTable.orderIndex), asc(quizAnswersTable.id));
}
