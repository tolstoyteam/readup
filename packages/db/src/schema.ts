import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const CHAPTER_BLOCK_TYPES = ["paragraph", "quote"] as const;
export type ChapterBlockType = (typeof CHAPTER_BLOCK_TYPES)[number];

export type ParagraphBlockContent = { text: string };
export type QuoteBlockContent = { text: string; source?: string };
export type ChapterBlockContent = ParagraphBlockContent | QuoteBlockContent;

/** Fixed voices used for every TTS generation (all three are produced per part). */
export const TTS_VOICE_IDS = ["alloy", "nova", "ash"] as const;
export type TtsVoiceId = (typeof TTS_VOICE_IDS)[number];

/** Supabase object paths for one audio part, one file per voice. */
export type BookTtsVoicePaths = Record<TtsVoiceId, string>;

/** TTS metadata stored inside the book JSON (`data` column). */
export type BookTtsAudio = {
  /** Keys are chunk indices as decimal strings (e.g. "0", "1"). */
  parts: Record<string, BookTtsVoicePaths>;
  updated_at?: string;
};

export type LegacyBookPageElement =
  | { type: "chapter_name"; content: string }
  | { type: "text"; content: string }
  | { type: "quote"; content: string }
  | { type: "keywords"; content: string[] };

export type LegacyBookDocument = {
  book_id?: string;
  title: string;
  author: string;
  language: string;
  genres: string[];
  cover_image_path?: string;
  difficulty?: string;
  reading_time_minutes?: number;
  total_pages: number;
  pages: {
    page_number: number;
    elements: LegacyBookPageElement[];
  }[];
  tts_audio?: BookTtsAudio;
};

/** @deprecated Mobile-only legacy JSON types until the app uses the relational schema. */
export type BookPageElement = LegacyBookPageElement;

/** @deprecated Mobile-only legacy JSON types until the app uses the relational schema. */
export type BookPage = LegacyBookDocument["pages"][number];

/** @deprecated Mobile-only legacy JSON types until the app uses the relational schema. */
export type BookDocument = LegacyBookDocument & { book_id: string };

/** @deprecated Mobile-only legacy JSON types until the app uses the relational schema. */
export type BookDataColumn = BookDocument | BookDocument[];

export type LibraryStatus = "saved" | "in_progress" | "completed";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
});

export const booksTable = pgTable(
  "books",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    author: text("author").notNull(),
    language: varchar("language", { length: 32 }).notNull(),
    /** Supabase Storage path for the cover image. Kept in the requested cover_image_url column. */
    coverImageUrl: text("cover_image_url"),
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    ttsAudio: jsonb("tts_audio").$type<BookTtsAudio>(),
    /** Nullable only for one-time migration/backfill from the previous JSONB architecture. */
    legacyData: jsonb("data").$type<LegacyBookDocument>(),
  },
  (table) => [index("books_title_idx").on(table.title)],
);

export const genresTable = pgTable("genres", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const bookGenresTable = pgTable(
  "book_genres",
  {
    bookId: integer("book_id")
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    genreId: integer("genre_id")
      .notNull()
      .references(() => genresTable.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.bookId, table.genreId] }),
    index("book_genres_book_id_idx").on(table.bookId),
    index("book_genres_genre_id_idx").on(table.genreId),
  ],
);

export const chaptersTable = pgTable(
  "chapters",
  {
    id: serial("id").primaryKey(),
    bookId: integer("book_id")
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    orderIndex: integer("order_index").notNull(),
  },
  (table) => [
    index("chapters_book_id_idx").on(table.bookId),
    index("chapters_book_order_idx").on(table.bookId, table.orderIndex),
  ],
);

export const chapterBlocksTable = pgTable(
  "chapter_blocks",
  {
    id: serial("id").primaryKey(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chaptersTable.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).$type<ChapterBlockType>().notNull(),
    content: jsonb("content").$type<ChapterBlockContent>().notNull(),
    orderIndex: integer("order_index").notNull(),
  },
  (table) => [
    index("chapter_blocks_chapter_id_idx").on(table.chapterId),
    index("chapter_blocks_chapter_order_idx").on(table.chapterId, table.orderIndex),
  ],
);

export const quizzesTable = pgTable(
  "quizzes",
  {
    id: serial("id").primaryKey(),
    bookId: integer("book_id")
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
  },
  (table) => [index("quizzes_book_id_idx").on(table.bookId)],
);

export const quizQuestionsTable = pgTable(
  "quiz_questions",
  {
    id: serial("id").primaryKey(),
    quizId: integer("quiz_id")
      .notNull()
      .references(() => quizzesTable.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    orderIndex: integer("order_index").notNull(),
  },
  (table) => [
    index("quiz_questions_quiz_id_idx").on(table.quizId),
    index("quiz_questions_quiz_order_idx").on(table.quizId, table.orderIndex),
  ],
);

export const quizAnswersTable = pgTable(
  "quiz_answers",
  {
    id: serial("id").primaryKey(),
    questionId: integer("question_id")
      .notNull()
      .references(() => quizQuestionsTable.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
  },
  (table) => [index("quiz_answers_question_id_idx").on(table.questionId)],
);

const authSchema = pgSchema("auth");

export const authUsersTable = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

export const profilesTable = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsersTable.id, { onDelete: "cascade" }),
  selectedInterests: text("selected_interests")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  readingGoal: text("reading_goal"),
  interestsStepDone: boolean("interests_step_done").notNull().default(false),
  goalStepDone: boolean("goal_step_done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userLibraryTable = pgTable(
  "user_library",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
    bookId: text("book_id").notNull(),
    status: text("status").$type<LibraryStatus>().notNull(),
    progress: jsonb("progress").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.bookId] }),
    check(
      "user_library_status_check",
      sql`${table.status} in ('saved', 'in_progress', 'completed')`,
    ),
  ],
);

export type BookRecord = typeof booksTable.$inferSelect;
export type NewBookRecord = typeof booksTable.$inferInsert;
export type GenreRecord = typeof genresTable.$inferSelect;
export type ChapterRecord = typeof chaptersTable.$inferSelect;
export type ChapterBlockRecord = typeof chapterBlocksTable.$inferSelect;
export type QuizRecord = typeof quizzesTable.$inferSelect;
export type QuizQuestionRecord = typeof quizQuestionsTable.$inferSelect;
export type QuizAnswerRecord = typeof quizAnswersTable.$inferSelect;
