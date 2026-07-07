import type {
  BookDocument,
  BookPage,
  LegacyBookPageElement,
} from "@readup/db/shared";
import { supabase, supabaseCoverPublicUrl } from "@/shared/lib/supabase";

import { embedKeywordsInLastChapter } from "@/features/books/lib/embed-book-keywords";
import { assignLegacyStableIds } from "@/features/books/lib/legacy-stable-ids";

import { fetchBookByBookId } from "./books";

/**
 * Try to assemble a reader-shaped `BookDocument` from the existing relational
 * tables (`books`, `book_genres`, `genres`, `chapters`, `chapter_blocks`).
 * Falls back to the legacy `books.data` JSONB so books that haven't been
 * migrated yet still render correctly.
 */
export async function fetchBookContent(
  bookId: string,
): Promise<{ id: number; document: BookDocument } | null> {
  const numericId = Number(bookId);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return fetchBookByBookId(bookId);
  }

  const { data: bookRow, error: bookError } = await supabase
    .from("books")
    .select(
      "id, work_id, status, title, author, language, cover_image_url, keywords, data, book_genres(genre:genres(name_ru,name)), book_works(cover_image_url)",
    )
    .eq("id", numericId)
    .maybeSingle();

  if (bookError || !bookRow) {
    return fetchBookByBookId(bookId);
  }
  const status = (bookRow as { status?: string | null }).status;
  if (status && status !== "published") {
    return null;
  }

  const { data: chapterRows, error: chaptersError } = await supabase
    .from("chapters")
    .select(
      "id, stable_id, title, order_index, chapter_blocks(id, stable_id, type, content, order_index)",
    )
    .eq("book_id", numericId)
    .order("order_index", { ascending: true });

  if (chaptersError) {
    return fetchBookByBookId(bookId);
  }

  if (!chapterRows || chapterRows.length === 0) {
    // Fall back to legacy JSON if no relational chapters exist yet.
    return fetchBookByBookId(bookId);
  }

  const pages: BookPage[] = chapterRows.map((row, index) => {
    const record = row as {
      id: number;
      stable_id: string;
      title: string;
      order_index: number;
      chapter_blocks: Array<{
        id: number;
        stable_id: string;
        type: string;
        content: { text?: string; source?: string } | null;
        order_index: number;
      }> | null;
    };
    const blocks = (record.chapter_blocks ?? [])
      .slice()
      .sort((a, b) => a.order_index - b.order_index);

    const elements: LegacyBookPageElement[] = [
      { type: "chapter_name" as const, content: record.title },
      ...blocks.flatMap<LegacyBookPageElement>((block) => {
        const text = block.content?.text ?? "";
        if (!text) return [];
        if (block.type === "quote") {
          return [
            {
              type: "quote" as const,
              content: text,
              block_stable_id: block.stable_id,
            },
          ];
        }
        return [
          {
            type: "text" as const,
            content: text,
            block_stable_id: block.stable_id,
          },
        ];
      }),
    ];

    return {
      page_number: record.order_index + 1 || index + 1,
      chapter_stable_id: record.stable_id,
      elements,
    };
  });

  const record = bookRow as unknown as {
    id: number;
    work_id: string | null;
    title: string;
    author: string | null;
    language: string | null;
    cover_image_url: string | null;
    keywords: string[] | null;
    data: { difficulty?: string; reading_time_minutes?: number } | null;
    book_genres:
      | Array<{ genre: { name?: string | null; name_ru?: string | null } | { name?: string | null; name_ru?: string | null }[] | null }>
      | null;
    book_works:
      | { cover_image_url: string | null }
      | { cover_image_url: string | null }[]
      | null;
  };

  const workCover = Array.isArray(record.book_works)
    ? record.book_works[0]?.cover_image_url
    : record.book_works?.cover_image_url;
  const coverImagePath =
    workCover?.trim() || record.cover_image_url?.trim() || undefined;

  const genres = (record.book_genres ?? [])
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

  const finalPages = assignLegacyStableIds(
    embedKeywordsInLastChapter(pages, record.keywords),
    String(record.id),
  );

  let availableEditions: BookDocument["available_editions"] = [];
  if (record.work_id) {
    const { data: siblingRows } = await supabase
      .from("books")
      .select("id, language")
      .eq("work_id", record.work_id)
      .eq("status", "published")
      .order("id", { ascending: true });
    availableEditions = (siblingRows ?? [])
      .map((row) => ({
        book_id: String((row as { id: number }).id),
        language: ((row as { language?: string | null }).language ?? "").trim(),
      }))
      .filter((edition) => edition.language.length > 0);
  }

  const document: BookDocument = {
    book_id: String(record.id),
    work_id: record.work_id ?? String(record.id),
    available_languages: availableEditions.map((edition) => edition.language),
    available_editions: availableEditions,
    title: record.title,
    author: record.author ?? "",
    language: record.language ?? "",
    genres,
    cover_image_path: coverImagePath,
    difficulty: record.data?.difficulty,
    reading_time_minutes: record.data?.reading_time_minutes,
    total_pages: Math.max(finalPages.length, 1),
    pages: finalPages,
  };

  return { id: record.id, document };
}

/**
 * Convenience helper returning a normalized cover URL.
 * Mobile already has `supabaseCoverPublicUrl` for this — re-exported here so
 * features that import from book-content don't need a second module.
 */
export { supabaseCoverPublicUrl };
