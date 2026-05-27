import { asc, desc, eq, inArray } from "drizzle-orm";
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
  type BookRecord,
  type ChapterBlockContent,
  type ChapterBlockType,
  type BookTtsAudio,
} from "@readup/db";
import { genreRuLabel, isBookGenre } from "@readup/db";
import type { BookContentInput } from "@/lib/book-content";

export type BookBlock = {
  id: number;
  type: ChapterBlockType;
  content: ChapterBlockContent;
  orderIndex: number;
};

export type BookChapter = {
  id: number;
  title: string;
  orderIndex: number;
  blocks: BookBlock[];
};

export type BookQuizAnswer = {
  id: number;
  text: string;
  isCorrect: boolean;
};

export type BookQuizQuestion = {
  id: number;
  question: string;
  orderIndex: number;
  answers: BookQuizAnswer[];
};

export type BookQuiz = {
  id: number;
  questions: BookQuizQuestion[];
};

export type BookWithContent = Omit<BookRecord, "legacyData"> & {
  genres: string[];
  chapters: BookChapter[];
  quiz?: BookQuiz;
};

export type BookListItem = Omit<BookRecord, "legacyData"> & {
  genres: string[];
  chapterCount: number;
};

type DbExecutor = Pick<typeof db, "insert" | "select">;

async function resolveGenreIds(tx: DbExecutor, genreNames: string[]) {
  const names = [...new Set(genreNames.map((name) => name.trim()).filter(Boolean))];
  if (names.length === 0) return [];

  await tx
    .insert(genresTable)
    .values(
      names.map((name) => ({
        name,
        nameRu: isBookGenre(name) ? genreRuLabel(name) : name,
      })),
    )
    .onConflictDoNothing();

  return tx
    .select({ id: genresTable.id, name: genresTable.name })
    .from(genresTable)
    .where(inArray(genresTable.name, names));
}

async function insertBookChildren(tx: DbExecutor, bookId: number, input: BookContentInput) {
  const genres = await resolveGenreIds(tx, input.genres);
  if (genres.length > 0) {
    await tx.insert(bookGenresTable).values(
      genres.map((genre) => ({
        bookId,
        genreId: genre.id,
      })),
    );
  }

  for (const [chapterIndex, chapter] of input.chapters.entries()) {
    const [insertedChapter] = await tx
      .insert(chaptersTable)
      .values({
        bookId,
        title: chapter.title,
        orderIndex: chapterIndex,
      })
      .returning({ id: chaptersTable.id });

    if (!insertedChapter) {
      throw new Error("Failed to insert chapter");
    }

    await tx.insert(chapterBlocksTable).values(
      chapter.blocks.map((block, blockIndex) => ({
        chapterId: insertedChapter.id,
        type: block.type,
        content: block.content,
        orderIndex: blockIndex,
      })),
    );
  }

  if (!input.quiz) return;

  const [quiz] = await tx
    .insert(quizzesTable)
    .values({ bookId })
    .returning({ id: quizzesTable.id });

  if (!quiz) {
    throw new Error("Failed to insert quiz");
  }

  for (const [questionIndex, question] of input.quiz.questions.entries()) {
    const [insertedQuestion] = await tx
      .insert(quizQuestionsTable)
      .values({
        quizId: quiz.id,
        question: question.question,
        orderIndex: questionIndex,
      })
      .returning({ id: quizQuestionsTable.id });

    if (!insertedQuestion) {
      throw new Error("Failed to insert quiz question");
    }

    await tx.insert(quizAnswersTable).values(
      question.answers.map((answer) => ({
        questionId: insertedQuestion.id,
        text: answer.text,
        isCorrect: answer.is_correct,
      })),
    );
  }
}

export async function createBookWithContent(input: BookContentInput): Promise<BookWithContent> {
  const [created] = await db.transaction(async (tx) => {
    const [book] = await tx
      .insert(booksTable)
      .values({
        title: input.title,
        author: input.author,
        language: input.language,
        coverImageUrl: input.cover_image_url ?? null,
        keywords: input.keywords,
      })
      .returning({ id: booksTable.id });

    if (!book) {
      throw new Error("Failed to insert book");
    }

    await insertBookChildren(tx, book.id, input);
    return [book];
  });

  return getBookWithContent(created.id).then((book) => {
    if (!book) throw new Error("Created book was not found");
    return book;
  });
}

export async function replaceBookContent(
  bookId: number,
  input: BookContentInput,
): Promise<BookWithContent | null> {
  const updated = await db.transaction(async (tx) => {
    const [book] = await tx
      .update(booksTable)
      .set({
        title: input.title,
        author: input.author,
        language: input.language,
        coverImageUrl: input.cover_image_url ?? null,
        keywords: input.keywords,
        ttsAudio: null,
      })
      .where(eq(booksTable.id, bookId))
      .returning({ id: booksTable.id });

    if (!book) return null;

    await tx.delete(quizzesTable).where(eq(quizzesTable.bookId, bookId));
    await tx.delete(chaptersTable).where(eq(chaptersTable.bookId, bookId));
    await tx.delete(bookGenresTable).where(eq(bookGenresTable.bookId, bookId));
    await insertBookChildren(tx, bookId, input);
    return book;
  });

  if (!updated) return null;
  return getBookWithContent(bookId);
}

export async function updateBookCover(
  bookId: number,
  coverImageUrl: string | null,
): Promise<void> {
  await db
    .update(booksTable)
    .set({ coverImageUrl })
    .where(eq(booksTable.id, bookId));
}

export async function updateBookTtsAudio(
  bookId: number,
  ttsAudio: BookTtsAudio | null,
): Promise<void> {
  await db.update(booksTable).set({ ttsAudio }).where(eq(booksTable.id, bookId));
}

export async function listBooks(): Promise<BookListItem[]> {
  const rows = await db
    .select({
      id: booksTable.id,
      title: booksTable.title,
      author: booksTable.author,
      language: booksTable.language,
      coverImageUrl: booksTable.coverImageUrl,
      keywords: booksTable.keywords,
      ttsAudio: booksTable.ttsAudio,
      genreName: genresTable.name,
      chapterId: chaptersTable.id,
    })
    .from(booksTable)
    .leftJoin(bookGenresTable, eq(bookGenresTable.bookId, booksTable.id))
    .leftJoin(genresTable, eq(genresTable.id, bookGenresTable.genreId))
    .leftJoin(chaptersTable, eq(chaptersTable.bookId, booksTable.id))
    .orderBy(desc(booksTable.id), asc(genresTable.name), asc(chaptersTable.orderIndex));

  const byId = new Map<number, BookListItem & { chapterIds: Set<number> }>();
  for (const row of rows) {
    let item = byId.get(row.id);
    if (!item) {
      item = {
        id: row.id,
        title: row.title,
        author: row.author,
        language: row.language,
        coverImageUrl: row.coverImageUrl,
        keywords: row.keywords,
        ttsAudio: row.ttsAudio,
        genres: [],
        chapterCount: 0,
        chapterIds: new Set<number>(),
      };
      byId.set(row.id, item);
    }
    if (row.genreName && !item.genres.includes(row.genreName)) {
      item.genres.push(row.genreName);
    }
    if (row.chapterId) {
      item.chapterIds.add(row.chapterId);
      item.chapterCount = item.chapterIds.size;
    }
  }

  return [...byId.values()].map((value) => {
    const { chapterIds, ...item } = value;
    void chapterIds;
    return item;
  });
}

export async function getBookWithContent(bookId: number): Promise<BookWithContent | null> {
  const [book] = await db
    .select()
    .from(booksTable)
    .where(eq(booksTable.id, bookId))
    .limit(1);

  if (!book) return null;

  const genreRows = await db
    .select({ name: genresTable.name })
    .from(bookGenresTable)
    .innerJoin(genresTable, eq(genresTable.id, bookGenresTable.genreId))
    .where(eq(bookGenresTable.bookId, bookId))
    .orderBy(asc(genresTable.name));

  const chapterRows = await db
    .select()
    .from(chaptersTable)
    .where(eq(chaptersTable.bookId, bookId))
    .orderBy(asc(chaptersTable.orderIndex));

  const blocks =
    chapterRows.length === 0
      ? []
      : await db
          .select()
          .from(chapterBlocksTable)
          .where(
            inArray(
              chapterBlocksTable.chapterId,
              chapterRows.map((chapter) => chapter.id),
            ),
          )
          .orderBy(asc(chapterBlocksTable.chapterId), asc(chapterBlocksTable.orderIndex));

  const blocksByChapter = new Map<number, BookBlock[]>();
  for (const block of blocks) {
    const list = blocksByChapter.get(block.chapterId) ?? [];
    list.push({
      id: block.id,
      type: block.type,
      content: block.content,
      orderIndex: block.orderIndex,
    });
    blocksByChapter.set(block.chapterId, list);
  }

  const [quizRow] = await db
    .select()
    .from(quizzesTable)
    .where(eq(quizzesTable.bookId, bookId))
    .limit(1);

  let quiz: BookQuiz | undefined;
  if (quizRow) {
    const questions = await db
      .select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quizId, quizRow.id))
      .orderBy(asc(quizQuestionsTable.orderIndex));

    const answers =
      questions.length === 0
        ? []
        : await db
            .select()
            .from(quizAnswersTable)
            .where(
              inArray(
                quizAnswersTable.questionId,
                questions.map((question) => question.id),
              ),
            );

    const answersByQuestion = new Map<number, BookQuizAnswer[]>();
    for (const answer of answers) {
      const list = answersByQuestion.get(answer.questionId) ?? [];
      list.push({
        id: answer.id,
        text: answer.text,
        isCorrect: answer.isCorrect,
      });
      answersByQuestion.set(answer.questionId, list);
    }

    quiz = {
      id: quizRow.id,
      questions: questions.map((question) => ({
        id: question.id,
        question: question.question,
        orderIndex: question.orderIndex,
        answers: answersByQuestion.get(question.id) ?? [],
      })),
    };
  }

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    language: book.language,
    coverImageUrl: book.coverImageUrl,
    keywords: book.keywords,
    ttsAudio: book.ttsAudio,
    genres: genreRows.map((genre) => genre.name),
    chapters: chapterRows.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      orderIndex: chapter.orderIndex,
      blocks: blocksByChapter.get(chapter.id) ?? [],
    })),
    ...(quiz ? { quiz } : {}),
  };
}
