export * from "./genres";

export const CHAPTER_BLOCK_TYPES = ["paragraph", "quote"] as const;
export type ChapterBlockType = (typeof CHAPTER_BLOCK_TYPES)[number];

export const BOOK_LENGTHS = ["short", "medium", "long"] as const;
export type BookLength = (typeof BOOK_LENGTHS)[number];

export const READING_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type ReadingLevel = (typeof READING_LEVELS)[number];

export type BookGenerationSettings = {
  topic: string;
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

export type ParagraphBlockContent = { text: string };
export type QuoteBlockContent = { text: string; source?: string };
export type ChapterBlockContent = ParagraphBlockContent | QuoteBlockContent;

export const TTS_VOICE_IDS = ["alloy", "nova", "ash"] as const;
export type TtsVoiceId = (typeof TTS_VOICE_IDS)[number];

export type BookTtsVoicePaths = Record<TtsVoiceId, string>;

export type BookTtsAudio = {
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

export type BookPageElement = LegacyBookPageElement;

export type BookPage = LegacyBookDocument["pages"][number] & {
  chapter_stable_id?: string;
};

export type BookDocument = LegacyBookDocument & { book_id: string };

export type BookDataColumn = BookDocument | BookDocument[];

export type ReadingStatus = "not_started" | "in_progress" | "completed";

export type LibraryStatus = "saved" | "in_progress" | "completed";

export type LibraryProgress = {
  page: number;
  total_pages: number;
  chapter_stable_id?: string;
  block_stable_id?: string;
  audio_position_ms?: number;
  last_read_at?: string;
};

export type WorkLibraryProgress = LibraryProgress & {
  edition_book_id?: string;
  canonical_position?: {
    chapter_stable_id?: string;
    block_stable_id?: string;
    page?: number;
    total_pages?: number;
  };
};

export type LibraryProgressCanonical = WorkLibraryProgress;

export type UserBookRecord = {
  workId: string;
  bookId: string;
  lastEditionId?: number | null;
  preferredLanguage?: string | null;
  isSaved: boolean;
  readingStatus: ReadingStatus;
  progress: WorkLibraryProgress | null;
  updatedAt: string | null;
};

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
