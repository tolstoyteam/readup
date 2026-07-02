import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const CHAPTER_BLOCK_TYPES = ["paragraph", "quote"] as const;
export type ChapterBlockType = (typeof CHAPTER_BLOCK_TYPES)[number];

export const BOOK_EDITION_STATUSES = [
  "draft",
  "generating",
  "translating",
  "generating_tts",
  "published",
  "failed",
] as const;
export type BookEditionStatus = (typeof BOOK_EDITION_STATUSES)[number];

export const GENERATION_JOB_TYPES = [
  "translation",
  "tts",
  "book_generation",
  "cover",
] as const;
export type GenerationJobType = (typeof GENERATION_JOB_TYPES)[number];

export const BOOK_LENGTHS = ["short", "medium", "long"] as const;
export type BookLength = (typeof BOOK_LENGTHS)[number];

export const READING_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type ReadingLevel = (typeof READING_LEVELS)[number];

export type BookGenerationSettings = {
  topic: string;
  audience: string;
  genres: string[];
  reading_level: ReadingLevel;
  length: BookLength;
  quiz_enabled: boolean;
};

export type BookGenerationMetadata = {
  source_language: "en";
  generated_languages: string[];
  settings: BookGenerationSettings;
  subtitle?: string;
  description?: string;
  generated_at: string;
};

export const GENERATION_JOB_STATUSES = ["queued", "running", "succeeded", "failed"] as const;
export type GenerationJobStatus = (typeof GENERATION_JOB_STATUSES)[number];

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

export type TextElementMeta = {
  block_stable_id?: string;
};

export type LegacyBookPageElement =
  | { type: "chapter_name"; content: string }
  | ({ type: "text"; content: string } & TextElementMeta)
  | ({ type: "quote"; content: string } & TextElementMeta)
  | { type: "keywords"; content: string[] };

export type LegacyBookDocument = {
  book_id?: string;
  work_id?: string;
  available_languages?: string[];
  available_editions?: { book_id: string; language: string }[];
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
export type BookPage = LegacyBookDocument["pages"][number] & {
  chapter_stable_id?: string;
};

/** @deprecated Mobile-only legacy JSON types until the app uses the relational schema. */
export type BookDocument = LegacyBookDocument & { book_id: string };

/** @deprecated Mobile-only legacy JSON types until the app uses the relational schema. */
export type BookDataColumn = BookDocument | BookDocument[];

export type ReadingStatus = "not_started" | "in_progress" | "completed";

/** @deprecated Use ReadingStatus — old single-column model included "saved" as a status. */
export type LibraryStatus = "saved" | "in_progress" | "completed";

/** Documented shape for `user_library.progress`. Stored as JSONB so app/server can extend without migration. */
export type LibraryProgress = {
  page: number;
  total_pages: number;
  chapter_stable_id?: string;
  block_stable_id?: string;
  audio_position_ms?: number;
  /** ISO timestamp of the last reader session that touched this row. */
  last_read_at?: string;
};

/** App-level view of a user's relationship with one logical book (work). */
export type UserBookRecord = {
  /** Canonical work identity. */
  workId: string;
  /** Edition id used for navigation (last read or preferred language). */
  bookId: string;
  lastEditionId?: number | null;
  preferredLanguage?: string | null;
  isSaved: boolean;
  readingStatus: ReadingStatus;
  progress: WorkLibraryProgress | null;
  updatedAt: string | null;
};

export const NOTIFICATION_TYPES = [
  "streak_reminder",
  "new_content",
  "quiz_reminder",
  "achievement",
  "daily_reading",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationPreferences = {
  daily_reminder?: boolean;
  streak_alerts?: boolean;
  new_content?: boolean;
  quiz_reminders?: boolean;
  achievements?: boolean;
};

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
});

export const bookWorksTable = pgTable(
  "book_works",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug"),
    coverImageUrl: text("cover_image_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("book_works_slug_unique").on(table.slug)],
);

export const booksTable = pgTable(
  "books",
  {
    id: serial("id").primaryKey(),
    workId: uuid("work_id")
      .notNull()
      .references(() => bookWorksTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    author: text("author").notNull(),
    language: varchar("language", { length: 32 }).notNull(),
    status: text("status").$type<BookEditionStatus>().notNull().default("draft"),
    sourceEditionId: integer("source_edition_id").references((): any => booksTable.id, {
      onDelete: "set null",
    }),
    translationError: text("translation_error"),
    ttsError: text("tts_error"),
    generationMetadata: jsonb("generation_metadata").$type<BookGenerationMetadata | null>(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** Supabase Storage path for the cover image. Kept in the requested cover_image_url column. */
    coverImageUrl: text("cover_image_url"),
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    ttsAudio: jsonb("tts_audio").$type<BookTtsAudio>(),
    /** Nullable only for one-time migration/backfill from the previous JSONB architecture. */
    legacyData: jsonb("data").$type<LegacyBookDocument>(),
  },
  (table) => [
    index("books_title_idx").on(table.title),
    index("books_work_id_idx").on(table.workId),
    index("books_status_idx").on(table.status),
    uniqueIndex("books_work_language_unique").on(table.workId, table.language),
    check(
      "books_status_check",
      sql`${table.status} in ('draft', 'generating', 'translating', 'generating_tts', 'published', 'failed')`,
    ),
  ],
);

export const genresTable = pgTable("genres", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  nameRu: text("name_ru").notNull(),
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
    stableId: uuid("stable_id").notNull().defaultRandom(),
    title: text("title").notNull(),
    orderIndex: integer("order_index").notNull(),
  },
  (table) => [
    index("chapters_book_id_idx").on(table.bookId),
    index("chapters_book_order_idx").on(table.bookId, table.orderIndex),
    index("chapters_stable_id_idx").on(table.stableId),
  ],
);

export const chapterBlocksTable = pgTable(
  "chapter_blocks",
  {
    id: serial("id").primaryKey(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chaptersTable.id, { onDelete: "cascade" }),
    stableId: uuid("stable_id").notNull().defaultRandom(),
    type: varchar("type", { length: 32 }).$type<ChapterBlockType>().notNull(),
    content: jsonb("content").$type<ChapterBlockContent>().notNull(),
    orderIndex: integer("order_index").notNull(),
  },
  (table) => [
    index("chapter_blocks_chapter_id_idx").on(table.chapterId),
    index("chapter_blocks_chapter_order_idx").on(table.chapterId, table.orderIndex),
    index("chapter_blocks_stable_id_idx").on(table.stableId),
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
  /** Service-role only flag. App reads but cannot update (enforced by trigger). */
  isPremium: boolean("is_premium").notNull().default(false),
  currentStreakDays: integer("current_streak_days").notNull().default(0),
  longestStreakDays: integer("longest_streak_days").notNull().default(0),
  lastReadDate: date("last_read_date"),
  totalBooksCompleted: integer("total_books_completed").notNull().default(0),
  totalReadingDays: integer("total_reading_days").notNull().default(0),
  totalReadingMinutes: integer("total_reading_minutes").notNull().default(0),
  dailyReadingGoalMinutes: integer("daily_reading_goal_minutes").notNull().default(5),
  notificationPreferences: jsonb("notification_preferences")
    .$type<NotificationPreferences>()
    .notNull()
    .default(sql`'{}'::jsonb`),
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
    isSaved: boolean("is_saved").notNull().default(false),
    readingStatus: text("reading_status").$type<ReadingStatus>().notNull().default("not_started"),
    progress: jsonb("progress").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.bookId] }),
    check(
      "user_library_reading_status_check",
      sql`${table.readingStatus} in ('not_started', 'in_progress', 'completed')`,
    ),
  ],
);

export type WorkLibraryProgress = LibraryProgress & {
  edition_book_id?: string;
  canonical_position?: {
    chapter_stable_id?: string;
    block_stable_id?: string;
    page?: number;
    total_pages?: number;
  };
};

/** @deprecated Alias for work-level progress in the mobile app. */
export type LibraryProgressCanonical = WorkLibraryProgress;

export const userWorkLibraryTable = pgTable(
  "user_work_library",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
    workId: uuid("work_id")
      .notNull()
      .references(() => bookWorksTable.id, { onDelete: "cascade" }),
    lastEditionId: integer("last_edition_id").references(() => booksTable.id, {
      onDelete: "set null",
    }),
    preferredLanguage: varchar("preferred_language", { length: 32 }),
    isSaved: boolean("is_saved").notNull().default(false),
    readingStatus: text("reading_status").$type<ReadingStatus>().notNull().default("not_started"),
    progress: jsonb("progress").$type<WorkLibraryProgress | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.workId] }),
    index("user_work_library_last_edition_idx").on(table.lastEditionId),
    check(
      "user_work_library_reading_status_check",
      sql`${table.readingStatus} in ('not_started', 'in_progress', 'completed')`,
    ),
  ],
);

export const userSearchHistoryTable = pgTable(
  "user_search_history",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    searchedAt: timestamp("searched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.query] }),
    index("user_search_history_searched_at_idx").on(table.userId, table.searchedAt),
  ],
);

export type QuizAttemptAnswer = {
  question_id: number;
  answer_id: number | null;
  is_correct: boolean;
};

export type UserQuote = {
  id: string;
  userId: string;
  workId: string;
  editionBookId: number;
  language: string;
  chapterStableId: string;
  chapterTitle?: string | null;
  pageNumber: number;
  blockStableId: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  createdAt: string;
};

export type CreateUserQuoteInput = Omit<UserQuote, "id" | "userId" | "createdAt">;

export const userQuotesTable = pgTable(
  "user_quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
    workId: uuid("work_id")
      .notNull()
      .references(() => bookWorksTable.id, { onDelete: "cascade" }),
    editionBookId: integer("edition_book_id")
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    language: varchar("language", { length: 32 }).notNull(),
    chapterStableId: text("chapter_stable_id").notNull(),
    chapterTitle: text("chapter_title"),
    pageNumber: integer("page_number").notNull(),
    blockStableId: text("block_stable_id").notNull(),
    startOffset: integer("start_offset").notNull(),
    endOffset: integer("end_offset").notNull(),
    selectedText: text("selected_text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_quotes_user_created_idx").on(table.userId, table.createdAt),
    index("user_quotes_user_edition_chapter_idx").on(
      table.userId,
      table.editionBookId,
      table.chapterStableId,
    ),
    uniqueIndex("user_quotes_unique_anchor_idx").on(
      table.userId,
      table.editionBookId,
      table.blockStableId,
      table.startOffset,
      table.endOffset,
    ),
    check("user_quotes_start_offset_check", sql`${table.startOffset} >= 0`),
    check("user_quotes_end_offset_check", sql`${table.endOffset} > ${table.startOffset}`),
  ],
);

export const userQuizAttemptsTable = pgTable(
  "user_quiz_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
    /** Edition id at attempt time (text form of `books.id`). */
    bookId: text("book_id").notNull(),
    workId: uuid("work_id").references(() => bookWorksTable.id, { onDelete: "set null" }),
    quizId: integer("quiz_id")
      .notNull()
      .references(() => quizzesTable.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    totalQuestions: integer("total_questions").notNull(),
    answers: jsonb("answers").$type<QuizAttemptAnswer[]>().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_quiz_attempts_user_book_idx").on(
      table.userId,
      table.bookId,
      table.completedAt,
    ),
    index("user_quiz_attempts_work_id_idx").on(table.userId, table.workId),
  ],
);

export const achievementsTable = pgTable("achievements", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  /** lucide-react-native icon name or asset key. */
  icon: text("icon").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  /** Stat key compared against `threshold` by _maybe_unlock_achievements. */
  metric: text("metric"),
  threshold: integer("threshold"),
});

export const userAchievementsTable = pgTable(
  "user_achievements",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
    achievementId: integer("achievement_id")
      .notNull()
      .references(() => achievementsTable.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.achievementId] })],
);

export const userNotificationsTable = pgTable(
  "user_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
    type: text("type").$type<NotificationType>().notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown> | null>(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_notifications_user_created_idx").on(table.userId, table.createdAt),
    check(
      "user_notifications_type_check",
      sql`${table.type} in ('streak_reminder', 'new_content', 'quiz_reminder', 'achievement', 'daily_reading')`,
    ),
  ],
);

export const readingDailyLogTable = pgTable(
  "reading_daily_log",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
    activityDate: date("activity_date").notNull(),
    minutesRead: integer("minutes_read").notNull().default(0),
    booksTouched: integer("books_touched").notNull().default(0),
    touchedWorkIds: jsonb("touched_work_ids").$type<string[]>().notNull().default([]),
  },
  (table) => [primaryKey({ columns: [table.userId, table.activityDate] })],
);

export const generationJobsTable = pgTable(
  "generation_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workId: uuid("work_id")
      .notNull()
      .references(() => bookWorksTable.id, { onDelete: "cascade" }),
    editionId: integer("edition_id").references(() => booksTable.id, { onDelete: "cascade" }),
    type: text("type").$type<GenerationJobType>().notNull(),
    status: text("status").$type<GenerationJobStatus>().notNull().default("queued"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("generation_jobs_work_id_idx").on(table.workId),
    index("generation_jobs_edition_id_idx").on(table.editionId),
    index("generation_jobs_status_idx").on(table.status),
    check(
      "generation_jobs_type_check",
      sql`${table.type} in ('translation', 'tts', 'book_generation', 'cover')`,
    ),
    check("generation_jobs_status_check", sql`${table.status} in ('queued', 'running', 'succeeded', 'failed')`),
  ],
);

export type BookWorkRecord = typeof bookWorksTable.$inferSelect;
export type BookRecord = typeof booksTable.$inferSelect;
export type NewBookRecord = typeof booksTable.$inferInsert;
export type GenreRecord = typeof genresTable.$inferSelect;
export type ChapterRecord = typeof chaptersTable.$inferSelect;
export type ChapterBlockRecord = typeof chapterBlocksTable.$inferSelect;
export type QuizRecord = typeof quizzesTable.$inferSelect;
export type QuizQuestionRecord = typeof quizQuestionsTable.$inferSelect;
export type QuizAnswerRecord = typeof quizAnswersTable.$inferSelect;
export type ProfileRecord = typeof profilesTable.$inferSelect;
export type UserWorkLibraryRecord = typeof userWorkLibraryTable.$inferSelect;
export type UserSearchHistoryRecord = typeof userSearchHistoryTable.$inferSelect;
export type UserQuoteRecord = typeof userQuotesTable.$inferSelect;
export type UserQuizAttemptRecord = typeof userQuizAttemptsTable.$inferSelect;
export type AchievementRecord = typeof achievementsTable.$inferSelect;
export type UserAchievementRecord = typeof userAchievementsTable.$inferSelect;
export type UserNotificationRecord = typeof userNotificationsTable.$inferSelect;
export type ReadingDailyLogRecord = typeof readingDailyLogTable.$inferSelect;
export type GenerationJobRecord = typeof generationJobsTable.$inferSelect;
