import type { BookContentInput } from "@/lib/book-content";

export type { BookGenre } from "@/lib/book-genres";
export { BOOK_GENRES } from "@/lib/book-genres";

export type BlockType = "paragraph" | "quote";

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: {
    text: string;
    source?: string;
  };
}

export interface EditorChapter {
  id: string;
  title: string;
  blocks: EditorBlock[];
}

export interface EditorQuizAnswer {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface EditorQuizQuestion {
  id: string;
  question: string;
  answers: EditorQuizAnswer[];
}

export interface EditorQuiz {
  questions: EditorQuizQuestion[];
}

export type BookEditorValues = Omit<BookContentInput, "chapters" | "quiz" | "cover_image_url"> & {
  cover_image_url?: string | null;
  chapters: EditorChapter[];
  quiz?: EditorQuiz;
};
