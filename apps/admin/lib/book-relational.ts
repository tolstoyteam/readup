import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  bookGenresTable,
  bookWorksTable,
  booksTable,
  chapterBlocksTable,
  chaptersTable,
  generationJobsTable,
  genresTable,
  quizAnswersTable,
  quizQuestionsTable,
  quizzesTable,
  type BookEditionStatus,
  type BookRecord,
  type ChapterBlockContent,
  type ChapterBlockType,
  type BookTtsAudio,
  type GenerationJobStatus,
  type GenerationJobType,
} from "@readup/db";
import { genreRuLabel, isBookGenre } from "@readup/db";
import type { BookContentInput } from "@/lib/book-content";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stableIdFromEditorId(id: string | undefined): string | undefined {
  return id && UUID_RE.test(id) ? id : undefined;
}

export type BookBlock = {
  id: number;
  stableId: string;
  type: ChapterBlockType;
  content: ChapterBlockContent;
  orderIndex: number;
};

export type BookChapter = {
  id: number;
  stableId: string;
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
  work: {
    id: string;
    slug: string | null;
    coverImageUrl: string | null;
  };
  genres: string[];
  chapters: BookChapter[];
  quiz?: BookQuiz;
};

export type BookListItem = Omit<BookRecord, "legacyData"> & {
  work: {
    id: string;
    slug: string | null;
    coverImageUrl: string | null;
  };
  genres: string[];
  chapterCount: number;
};

export type BookWorkListItem = {
  id: string;
  slug: string | null;
  coverImageUrl: string | null;
  title: string;
  author: string;
  languages: string[];
  statuses: Record<string, BookEditionStatus>;
  editions: BookListItem[];
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
        stableId: stableIdFromEditorId(chapter.id),
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
        stableId: stableIdFromEditorId(block.id),
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

export async function createBookWork(args: {
  slug?: string | null;
  coverImageUrl?: string | null;
} = {}): Promise<{ id: string; slug: string | null; coverImageUrl: string | null }> {
  const [work] = await db
    .insert(bookWorksTable)
    .values({
      slug: args.slug ?? null,
      coverImageUrl: args.coverImageUrl ?? null,
    })
    .returning({
      id: bookWorksTable.id,
      slug: bookWorksTable.slug,
      coverImageUrl: bookWorksTable.coverImageUrl,
    });
  if (!work) throw new Error("Failed to create book work");
  return work;
}

export async function createEditionForWork(args: {
  workId: string;
  input: BookContentInput;
  status?: BookEditionStatus;
  sourceEditionId?: number | null;
}): Promise<BookWithContent> {
  const [created] = await db.transaction(async (tx) => {
    const [book] = await tx
      .insert(booksTable)
      .values({
        workId: args.workId,
        title: args.input.title,
        author: args.input.author,
        language: args.input.language,
        status: args.status ?? "draft",
        sourceEditionId: args.sourceEditionId ?? null,
        publishedAt: args.status === "published" ? new Date() : null,
        coverImageUrl: args.input.cover_image_url ?? null,
        keywords: args.input.keywords,
      })
      .returning({ id: booksTable.id });

    if (!book) {
      throw new Error("Failed to insert book");
    }

    await insertBookChildren(tx, book.id, args.input);
    return [book];
  });

  return getBookWithContent(created.id).then((book) => {
    if (!book) throw new Error("Created book was not found");
    return book;
  });
}

export async function createBookWithContent(input: BookContentInput): Promise<BookWithContent> {
  const work = await createBookWork({ coverImageUrl: input.cover_image_url ?? null });
  return createEditionForWork({
    workId: work.id,
    input,
    status: "published",
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
        ttsError: null,
        status: "generating_tts",
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
  const book = await getBookWithContent(bookId);
  if (!book) return;
  await updateWorkCover(book.workId, coverImageUrl);
}

export async function updateWorkCover(workId: string, coverImageUrl: string | null): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(bookWorksTable)
      .set({ coverImageUrl, updatedAt: new Date() })
      .where(eq(bookWorksTable.id, workId));
    await tx
      .update(booksTable)
      .set({ coverImageUrl })
      .where(eq(booksTable.workId, workId));
  });
}

export async function updateBookTtsAudio(
  bookId: number,
  ttsAudio: BookTtsAudio | null,
): Promise<void> {
  await db
    .update(booksTable)
    .set({
      ttsAudio,
      ttsError: null,
      status: ttsAudio ? "published" : "draft",
      publishedAt: ttsAudio ? new Date() : null,
    })
    .where(eq(booksTable.id, bookId));
}

export async function updateEditionStatus(
  bookId: number,
  status: BookEditionStatus,
  errorField?: "translationError" | "ttsError",
  error?: string | null,
): Promise<void> {
  await db
    .update(booksTable)
    .set({
      status,
      ...(status === "published" ? { publishedAt: new Date() } : {}),
      ...(errorField ? { [errorField]: error ?? null } : {}),
    })
    .where(eq(booksTable.id, bookId));
}

export async function createGenerationJob(args: {
  workId: string;
  editionId?: number | null;
  type: GenerationJobType;
  payload?: Record<string, unknown>;
}) {
  const [job] = await db
    .insert(generationJobsTable)
    .values({
      workId: args.workId,
      editionId: args.editionId ?? null,
      type: args.type,
      payload: args.payload ?? {},
    })
    .returning();
  if (!job) throw new Error("Failed to create generation job");
  return job;
}

export async function updateGenerationJob(
  jobId: string,
  status: GenerationJobStatus,
  error?: string | null,
) {
  await db
    .update(generationJobsTable)
    .set({
      status,
      lastError: error ?? null,
      updatedAt: new Date(),
    })
    .where(eq(generationJobsTable.id, jobId));
}

export async function markGenerationJobRunning(jobId: string) {
  const [job] = await db
    .select({ attemptCount: generationJobsTable.attemptCount })
    .from(generationJobsTable)
    .where(eq(generationJobsTable.id, jobId))
    .limit(1);

  await db
    .update(generationJobsTable)
    .set({
      status: "running",
      attemptCount: (job?.attemptCount ?? 0) + 1,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(generationJobsTable.id, jobId));
}

export async function listBooks(): Promise<BookListItem[]> {
  const rows = await db
    .select({
      id: booksTable.id,
      workId: booksTable.workId,
      title: booksTable.title,
      author: booksTable.author,
      language: booksTable.language,
      status: booksTable.status,
      sourceEditionId: booksTable.sourceEditionId,
      translationError: booksTable.translationError,
      ttsError: booksTable.ttsError,
      generationMetadata: booksTable.generationMetadata,
      publishedAt: booksTable.publishedAt,
      coverImageUrl: bookWorksTable.coverImageUrl,
      editionCoverImageUrl: booksTable.coverImageUrl,
      keywords: booksTable.keywords,
      ttsAudio: booksTable.ttsAudio,
      legacyData: booksTable.legacyData,
      workSlug: bookWorksTable.slug,
      genreName: genresTable.name,
      chapterId: chaptersTable.id,
    })
    .from(booksTable)
    .innerJoin(bookWorksTable, eq(bookWorksTable.id, booksTable.workId))
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
        workId: row.workId,
        title: row.title,
        author: row.author,
        language: row.language,
        status: row.status,
        sourceEditionId: row.sourceEditionId,
        translationError: row.translationError,
        ttsError: row.ttsError,
        generationMetadata: row.generationMetadata,
        publishedAt: row.publishedAt,
        coverImageUrl: row.coverImageUrl ?? row.editionCoverImageUrl,
        keywords: row.keywords,
        ttsAudio: row.ttsAudio,
        work: {
          id: row.workId,
          slug: row.workSlug,
          coverImageUrl: row.coverImageUrl ?? row.editionCoverImageUrl,
        },
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

export async function listBookWorks(): Promise<BookWorkListItem[]> {
  const editions = await listBooks();
  const byWork = new Map<string, BookWorkListItem>();

  for (const edition of editions) {
    let work = byWork.get(edition.work.id);
    if (!work) {
      work = {
        id: edition.work.id,
        slug: edition.work.slug,
        coverImageUrl: edition.work.coverImageUrl,
        title: edition.title,
        author: edition.author,
        languages: [],
        statuses: {},
        editions: [],
      };
      byWork.set(edition.work.id, work);
    }
    work.editions.push(edition);
    if (!work.languages.includes(edition.language)) {
      work.languages.push(edition.language);
    }
    work.statuses[edition.language] = edition.status;
  }

  return [...byWork.values()];
}

export async function getBookWithContent(bookId: number): Promise<BookWithContent | null> {
  const [row] = await db
    .select({
      book: booksTable,
      work: bookWorksTable,
    })
    .from(booksTable)
    .innerJoin(bookWorksTable, eq(bookWorksTable.id, booksTable.workId))
    .where(eq(booksTable.id, bookId))
    .limit(1);

  if (!row) return null;
  const book = row.book;
  const work = row.work;

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
      stableId: block.stableId,
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
    workId: book.workId,
    title: book.title,
    author: book.author,
    language: book.language,
    status: book.status,
    sourceEditionId: book.sourceEditionId,
    translationError: book.translationError,
    ttsError: book.ttsError,
    generationMetadata: book.generationMetadata,
    publishedAt: book.publishedAt,
    coverImageUrl: work.coverImageUrl ?? book.coverImageUrl,
    keywords: book.keywords,
    ttsAudio: book.ttsAudio,
    work: {
      id: work.id,
      slug: work.slug,
      coverImageUrl: work.coverImageUrl ?? book.coverImageUrl,
    },
    genres: genreRows.map((genre) => genre.name),
    chapters: chapterRows.map((chapter) => ({
      id: chapter.id,
      stableId: chapter.stableId,
      title: chapter.title,
      orderIndex: chapter.orderIndex,
      blocks: blocksByChapter.get(chapter.id) ?? [],
    })),
    ...(quiz ? { quiz } : {}),
  };
}

export async function getEditionByWorkLanguage(
  workId: string,
  language: string,
): Promise<BookWithContent | null> {
  const [row] = await db
    .select({ id: booksTable.id })
    .from(booksTable)
    .where(and(eq(booksTable.workId, workId), eq(booksTable.language, language)))
    .limit(1);
  return row ? getBookWithContent(row.id) : null;
}
