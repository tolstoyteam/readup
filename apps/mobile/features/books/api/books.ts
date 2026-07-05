import type { BookDataColumn, BookDocument, BookPage } from "@readup/db/shared";
import { genreRuLabel, isBookGenre } from "@readup/db/shared";
import { embedKeywordsInLastChapter } from "@/features/books/lib/embed-book-keywords";
import { assignLegacyStableIds } from "@/features/books/lib/legacy-stable-ids";
import { pickEdition } from "@/features/books/lib/pick-edition";
import type { ReaderLanguage } from "@/features/reader/settings/reader-settings";
import { loadReaderSettings } from "@/features/reader/settings/reader-settings-storage";
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
  work_id: string | null;
  status: string | null;
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
  "id, work_id, status, title, author, language, cover_image_url, keywords, data, book_genres(genre:genres(name_ru,name))";

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
    work_id: row.work_id ?? String(row.id),
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

function pickEditionForWork(
  rows: RelationalBookRow[],
  preferredLanguage: string,
): RelationalBookRow {
  const published = rows.filter((row) => !row.status || row.status === "published");
  const candidates = published.length > 0 ? published : rows;
  const normalized = candidates.map((row) => ({
    ...row,
    language: row.language ?? "",
  }));
  return pickEdition(normalized, preferredLanguage) ?? normalized[0]!;
}

function withAvailableLanguages(document: BookDocument, rows: RelationalBookRow[]): BookDocument {
  return {
    ...document,
    available_languages: [
      ...new Set(
        rows
          .map((row) => row.language)
          .filter((language): language is string => typeof language === "string" && language.length > 0),
      ),
    ],
    available_editions: rows
      .filter((row) => !row.status || row.status === "published")
      .map((row) => ({
        book_id: String(row.id),
        language: row.language ?? "",
      }))
      .filter((edition) => edition.language.length > 0),
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
  const pages = assignLegacyStableIds(
    embedKeywordsInLastChapter(normalizePages(obj.pages)),
    book_id,
  );
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

  const total_pages = Math.max(pages.length, 1);

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

export async function fetchBooks(
  preferredLanguage?: ReaderLanguage,
): Promise<FetchBooksResult> {
  const settings = preferredLanguage
    ? { language: preferredLanguage }
    : await loadReaderSettings().catch(() => ({ language: "ru" as const }));
  const { data, error } = await supabase
    .from("books")
    .select(BOOK_LIST_SELECT)
    .order("id", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as RelationalBookRow[];
  const books: { id: number; document: BookDocument }[] = [];
  const byWork = new Map<string, RelationalBookRow[]>();

  for (const row of rows) {
    if (row.status && row.status !== "published") continue;
    const workId = row.work_id ?? String(row.id);
    const group = byWork.get(workId) ?? [];
    group.push(row);
    byWork.set(workId, group);
  }

  for (const workRows of byWork.values()) {
    const row = pickEditionForWork(workRows, settings.language);
    const fromLegacy = normalizeBooksFromCell(row.data);
    if (fromLegacy.length > 0) {
      const match =
        fromLegacy.find((document) => document.language === settings.language) ??
        fromLegacy[0];
      if (match) books.push({ id: row.id, document: withAvailableLanguages(match, workRows) });
      continue;
    }
    books.push({ id: row.id, document: withAvailableLanguages(documentFromRelationalRow(row), workRows) });
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
      if (row.status && row.status !== "published") return null;
      const fromLegacy = normalizeBooksFromCell(row.data);
      if (fromLegacy.length > 0) {
        const match =
          fromLegacy.find((doc) => doc.book_id === bookId) ?? fromLegacy[0];
        if (match) {
          const pages = assignLegacyStableIds(
            embedKeywordsInLastChapter(match.pages, row.keywords),
            bookId,
          );
          return {
            id: row.id,
            document: {
              ...match,
              pages,
              total_pages: Math.max(pages.length, 1),
            },
          };
        }
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
