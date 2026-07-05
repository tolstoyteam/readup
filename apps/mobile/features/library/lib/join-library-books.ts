import { coverUrl } from "@/features/books/api/books";
import { pickEdition } from "@/features/books/lib/pick-edition";
import type { BookCardItem } from "@/features/books/components/book-card";
import type { UserBookRecord } from "@readup/db/shared";

export type LibraryBookCard = BookCardItem & UserBookRecord;

type CatalogRow = {
  id: number;
  document: {
    book_id: string;
    work_id?: string;
    language?: string;
    available_editions?: { book_id: string; language: string }[];
    title: string;
    author?: string;
    cover_image_path?: string | null;
  };
};

export type CatalogEditionRef = {
  bookId: string;
  workId: string;
  language: string;
};

export function buildBookCatalogMap(rows: CatalogRow[]): {
  byBookId: Map<string, BookCardItem & { workId: string }>;
  byWorkId: Map<string, BookCardItem & { workId: string }>;
  editionRefs: CatalogEditionRef[];
} {
  const byBookId = new Map<string, BookCardItem & { workId: string }>();
  const byWorkId = new Map<string, BookCardItem & { workId: string }>();
  const editionRefs: CatalogEditionRef[] = [];

  for (const row of rows) {
    const workId = row.document.work_id ?? row.document.book_id;
    const item = {
      id: row.id,
      bookId: row.document.book_id,
      workId,
      title: row.document.title,
      author: row.document.author,
      cover: coverUrl(row.document.cover_image_path ?? undefined),
    };
    byWorkId.set(workId, item);
    byBookId.set(row.document.book_id, item);
    editionRefs.push({
      bookId: row.document.book_id,
      workId,
      language: row.document.language ?? "",
    });
    for (const edition of row.document.available_editions ?? []) {
      byBookId.set(edition.book_id, { ...item, bookId: edition.book_id });
      editionRefs.push({
        bookId: edition.book_id,
        workId,
        language: edition.language,
      });
    }
  }

  return { byBookId, byWorkId, editionRefs };
}

export function resolveDisplayBookId(
  record: UserBookRecord,
  editions: CatalogEditionRef[],
  preferredLanguage?: string,
): string {
  const workEditions = editions.filter((edition) => edition.workId === record.workId);
  if (workEditions.length === 0) {
    return record.bookId;
  }
  const picked = pickEdition(workEditions, preferredLanguage ?? record.preferredLanguage ?? "ru");
  return picked?.bookId ?? record.bookId;
}

export function joinLibraryBooks(
  records: UserBookRecord[],
  catalog: ReturnType<typeof buildBookCatalogMap>,
  preferredLanguage?: string,
): LibraryBookCard[] {
  return records
    .map((record) => {
      const book =
        catalog.byWorkId.get(record.workId) ?? catalog.byBookId.get(record.bookId);
      if (!book) return null;
      const bookId = resolveDisplayBookId(record, catalog.editionRefs, preferredLanguage);
      return {
        ...book,
        ...record,
        bookId,
      };
    })
    .filter((item): item is LibraryBookCard => item != null);
}
