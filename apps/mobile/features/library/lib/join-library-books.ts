import { coverUrl } from "@/features/books/api/books";
import type { BookCardItem } from "@/features/books/components/book-card";
import type { UserBookRecord } from "@readup/db";

export type LibraryBookCard = BookCardItem & UserBookRecord;

type CatalogRow = {
  id: number;
  document: {
    book_id: string;
    title: string;
    author?: string;
    cover_image_path?: string | null;
  };
};

export function buildBookCatalogMap(rows: CatalogRow[]): Map<string, BookCardItem> {
  return new Map(
    rows.map((row) => [
      row.document.book_id,
      {
        id: row.id,
        bookId: row.document.book_id,
        title: row.document.title,
        author: row.document.author,
        cover: coverUrl(row.document.cover_image_path ?? undefined),
      },
    ]),
  );
}

export function joinLibraryBooks(
  records: UserBookRecord[],
  catalog: Map<string, BookCardItem>,
): LibraryBookCard[] {
  return records
    .map((record) => {
      const book = catalog.get(record.bookId);
      if (!book) return null;
      return { ...book, ...record };
    })
    .filter((item): item is LibraryBookCard => item != null);
}
