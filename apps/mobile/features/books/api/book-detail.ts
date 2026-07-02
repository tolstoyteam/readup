import { bookHasPlayableQuiz } from "@/features/quiz/api/quiz";
import { supabase, supabaseCoverPublicUrl } from "@/shared/lib/supabase";

import { fetchBookContent } from "./book-content";

/** Lightweight book-detail payload for the resolved published edition of a work. */
export type BookDetail = {
  id: number;
  bookId: string;
  title: string;
  author: string;
  language: string;
  cover: string | null;
  genres: string[];
  difficulty: string | null;
  readingTimeMinutes: number | null;
  totalPages: number | null;
  hasQuiz: boolean;
  workId: string;
  availableEditions: { bookId: string; language: string }[];
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toGenres(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((g): g is string => typeof g === "string" && g.length > 0);
}

export async function fetchBookDetail(bookId: string): Promise<BookDetail | null> {
  const row = await fetchBookContent(bookId);
  if (!row) return null;

  const { document, id } = row;

  let hasQuiz = false;
  try {
    hasQuiz = await bookHasPlayableQuiz(document.book_id);
  } catch {
    hasQuiz = false;
  }

  let availableEditions: { bookId: string; language: string }[] = [];
  if (document.work_id) {
    const { data } = await supabase
      .from("books")
      .select("id, language")
      .eq("work_id", document.work_id)
      .eq("status", "published")
      .order("id", { ascending: true });
    availableEditions = (data ?? [])
      .map((edition) => ({
        bookId: String((edition as { id: number }).id),
        language: ((edition as { language?: string | null }).language ?? "").trim(),
      }))
      .filter((edition) => edition.language.length > 0);
  }

  return {
    id,
    bookId: document.book_id,
    title: document.title,
    author: document.author,
    language: document.language,
    cover: supabaseCoverPublicUrl(document.cover_image_path),
    genres: toGenres(document.genres),
    difficulty: document.difficulty ?? null,
    readingTimeMinutes: toNumber(document.reading_time_minutes),
    totalPages: toNumber(document.total_pages),
    hasQuiz,
    workId: document.work_id ?? document.book_id,
    availableEditions,
  };
}
