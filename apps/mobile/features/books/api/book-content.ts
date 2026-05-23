import type {
  BookDocument,
  BookPage,
  LegacyBookPageElement,
} from "@readup/db";
import { supabase, supabaseCoverPublicUrl } from "@/shared/lib/supabase";

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
      "id, title, author, language, cover_image_url, keywords, data, book_genres(genre:genres(name))",
    )
    .eq("id", numericId)
    .maybeSingle();

  if (bookError || !bookRow) {
    return fetchBookByBookId(bookId);
  }

  const { data: chapterRows, error: chaptersError } = await supabase
    .from("chapters")
    .select(
      "id, title, order_index, chapter_blocks(id, type, content, order_index)",
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
      title: string;
      order_index: number;
      chapter_blocks: Array<{
        id: number;
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
          return [{ type: "quote" as const, content: text }];
        }
        return [{ type: "text" as const, content: text }];
      }),
    ];

    return {
      page_number: record.order_index + 1 || index + 1,
      elements,
    };
  });

  const record = bookRow as unknown as {
    id: number;
    title: string;
    author: string | null;
    language: string | null;
    cover_image_url: string | null;
    keywords: string[] | null;
    data: { difficulty?: string; reading_time_minutes?: number } | null;
    book_genres:
      | Array<{ genre: { name: string } | { name: string }[] | null }>
      | null;
  };

  const genres = (record.book_genres ?? [])
    .flatMap((row) => {
      if (!row.genre) return [];
      if (Array.isArray(row.genre)) {
        return row.genre.map((g) => g.name).filter(Boolean);
      }
      return [row.genre.name].filter(Boolean);
    })
    .filter((name): name is string => !!name);

  const document: BookDocument = {
    book_id: String(record.id),
    title: record.title,
    author: record.author ?? "",
    language: record.language ?? "",
    genres,
    cover_image_path: record.cover_image_url ?? undefined,
    difficulty: record.data?.difficulty,
    reading_time_minutes: record.data?.reading_time_minutes,
    total_pages: pages.length,
    pages,
  };

  return { id: record.id, document };
}

/**
 * Convenience helper returning a normalized cover URL.
 * Mobile already has `supabaseCoverPublicUrl` for this — re-exported here so
 * features that import from book-content don't need a second module.
 */
export { supabaseCoverPublicUrl };
