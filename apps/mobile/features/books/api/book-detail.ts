import { supabase, supabaseCoverPublicUrl } from "@/shared/lib/supabase";

import { fetchBookContent } from "./book-content";

/**
 * Lightweight book-detail payload assembled from existing tables.
 * The `books` schema itself is unchanged — we surface what we need by joining
 * `book_genres` + `genres` and falling back to legacy `data` JSON for
 * difficulty/reading time where present.
 */
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

  let quizCount = 0;
  try {
    const { count } = await supabase
      .from("quizzes")
      .select("id", { count: "exact", head: true })
      .eq("book_id", id);
    quizCount = count ?? 0;
  } catch {
    quizCount = 0;
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
    hasQuiz: quizCount > 0,
  };
}
