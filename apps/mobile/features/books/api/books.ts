import type { BookDataColumn, BookDocument, BookPage } from "@readup/db";
import { genreRuLabel, isBookGenre } from "@readup/db";
import { supabase, supabaseCoverPublicUrl } from "@/shared/lib/supabase";

export type BookRow = {
  id: number;
  data: BookDataColumn;
};

export type FetchBooksResult = {
  books: { id: number; document: BookDocument }[];
  /** How many table rows PostgREST returned (0 with no error often means RLS or an empty table). */
  tableRowCount: number;
};

type RelationalBookRow = {
  id: number;
  title: string;
  author: string | null;
  language: string | null;
  cover_image_url: string | null;
  keywords: string[] | null;
  data: BookDataColumn | null;
  book_genres:
    | Array<{ genre: { name?: string | null; name_ru?: string | null } | { name?: string | null; name_ru?: string | null }[] | null }>
    | null;
};

const BOOK_LIST_SELECT =
  "id, title, author, language, cover_image_url, keywords, data, book_genres(genre:genres(name_ru,name))";

export function extractGenresFromJoin(
  bookGenres: RelationalBookRow["book_genres"],
): string[] {
  return (bookGenres ?? [])
    .flatMap((row) => {
      if (!row.genre) return [];
      if (Array.isArray(row.genre)) {
        return row.genre
          .map((g) => (g.name_ru ?? g.name ?? "").trim())
          .filter(Boolean);
      }
      return [(row.genre.name_ru ?? row.genre.name ?? "").trim()].filter(Boolean);
    })
    .filter((name): name is string => !!name);
}

/** Build a list/detail stub when only relational columns exist (no legacy JSONB). */
export function documentFromRelationalRow(row: RelationalBookRow): BookDocument {
  const legacy = asRecord(row.data);
  return {
    book_id: String(row.id),
    title: row.title,
    author: row.author ?? "",
    language: row.language ?? "",
    genres: extractGenresFromJoin(row.book_genres),
    cover_image_path: row.cover_image_url ?? undefined,
    difficulty:
      typeof legacy?.difficulty === "string" ? legacy.difficulty : undefined,
    reading_time_minutes:
      typeof legacy?.reading_time_minutes === "number"
        ? legacy.reading_time_minutes
        : undefined,
    total_pages: 1,
    pages: [],
  };
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v != null && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

function stringish(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim().length > 0) return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

function normalizePages(raw: unknown): BookPage[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p, i) => {
    const pr = asRecord(p);
    if (!pr) {
      return { page_number: i + 1, elements: [] };
    }
    const page_number =
      typeof pr.page_number === "number"
        ? pr.page_number
        : typeof pr.pageNumber === "number"
          ? pr.pageNumber
          : i + 1;
    const elements = Array.isArray(pr.elements) ? pr.elements : [];
    return { page_number, elements: elements as BookPage["elements"] };
  });
}

function normalizeOneBook(obj: Record<string, unknown>): BookDocument | null {
  const book_id =
    stringish(obj.book_id) ??
    stringish(obj.bookId);
  if (!book_id) return null;

  const title = stringish(obj.title) ?? "Untitled";
  const pages = normalizePages(obj.pages);
  const author = typeof obj.author === "string" ? obj.author : "";
  const language = typeof obj.language === "string" ? obj.language : "";
  const genres = Array.isArray(obj.genres)
    ? obj.genres
        .filter((g): g is string => typeof g === "string")
        .map((g) => g.trim())
        .filter(Boolean)
        .map((g) => (isBookGenre(g) ? genreRuLabel(g) : g))
    : [];

  const cover_image_path =
    typeof obj.cover_image_path === "string"
      ? obj.cover_image_path
      : typeof obj.coverImagePath === "string"
        ? obj.coverImagePath
        : undefined;

  const difficulty =
    typeof obj.difficulty === "string" ? obj.difficulty : undefined;

  const reading_time_minutes =
    typeof obj.reading_time_minutes === "number"
      ? obj.reading_time_minutes
      : typeof obj.readingTimeMinutes === "number"
        ? obj.readingTimeMinutes
        : undefined;

  const total_pages =
    typeof obj.total_pages === "number"
      ? obj.total_pages
      : typeof obj.totalPages === "number"
        ? obj.totalPages
        : Math.max(pages.length, 1);

  return {
    book_id,
    title,
    author,
    language,
    genres,
    cover_image_path,
    difficulty,
    reading_time_minutes,
    total_pages,
    pages,
  };
}

/**
 * One `data` cell may be a single book object, a one-element array (legacy), or multiple books in one array.
 */
export function normalizeBooksFromCell(raw: unknown): BookDocument[] {
  if (raw == null) return [];

  if (Array.isArray(raw)) {
    const out: BookDocument[] = [];
    for (const item of raw) {
      const rec = asRecord(item);
      if (!rec) continue;
      const looksLikeBook =
        rec.book_id != null ||
        rec.bookId != null ||
        (rec.title != null && rec.pages != null);
      if (!looksLikeBook) continue;
      const b = normalizeOneBook(rec);
      if (b) out.push(b);
    }
    return out;
  }

  const rec = asRecord(raw);
  if (!rec) return [];
  const b = normalizeOneBook(rec);
  return b ? [b] : [];
}

/** @deprecated Prefer normalizeBooksFromCell; returns first book only. */
export function normalizeBookPayload(raw: unknown): BookDocument | null {
  const all = normalizeBooksFromCell(raw);
  return all[0] ?? null;
}

export function coverUrl(path: string | undefined): string | null {
  return supabaseCoverPublicUrl(path);
}

export async function fetchBooks(): Promise<FetchBooksResult> {
  const { data, error } = await supabase
    .from("books")
    .select(BOOK_LIST_SELECT)
    .order("id", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as RelationalBookRow[];
  const books: { id: number; document: BookDocument }[] = [];

  for (const row of rows) {
    const fromLegacy = normalizeBooksFromCell(row.data);
    if (fromLegacy.length > 0) {
      for (const document of fromLegacy) {
        books.push({ id: row.id, document });
      }
      continue;
    }
    books.push({ id: row.id, document: documentFromRelationalRow(row) });
  }

  if (__DEV__ && rows.length === 0) {
    console.warn(
      "[fetchBooks] 0 rows from public.books. Check RLS SELECT policy for anon/authenticated (see packages/db/sql/supabase-books-anon-select.sql).",
    );
  } else if (__DEV__ && rows.length > 0 && books.length === 0) {
    console.warn(
      "[fetchBooks] Books table has rows but none could be parsed. Relational columns or legacy data JSON may be missing.",
    );
  }

  return { books, tableRowCount: rows.length };
}

export async function fetchBookByBookId(
  bookId: string,
): Promise<{ id: number; document: BookDocument } | null> {
  const numericId = Number(bookId);
  if (Number.isFinite(numericId) && numericId > 0) {
    const { data, error } = await supabase
      .from("books")
      .select(BOOK_LIST_SELECT)
      .eq("id", numericId)
      .maybeSingle();

    if (!error && data) {
      const row = data as RelationalBookRow;
      const fromLegacy = normalizeBooksFromCell(row.data);
      if (fromLegacy.length > 0) {
        const match = fromLegacy.find((doc) => doc.book_id === bookId) ?? fromLegacy[0];
        if (match) return { id: row.id, document: match };
      }
      return { id: row.id, document: documentFromRelationalRow(row) };
    }
  }

  const { data, error } = await supabase.from("books").select("id, data");

  if (error) throw error;

  for (const row of data ?? []) {
    for (const document of normalizeBooksFromCell(row.data)) {
      if (document.book_id === bookId) return { id: row.id, document };
    }
  }
  return null;
}
