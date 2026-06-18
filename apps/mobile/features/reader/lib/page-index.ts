import type { BookPage } from "@readup/db";

/** Map saved progress page label to a sorted-pages array index. */
export function pageIndexFromSavedPage(
  savedPage: number,
  pages: BookPage[],
): number {
  if (pages.length === 0) return 0;
  if (savedPage <= 0) return 0;

  const byPageNumber = pages.findIndex((p) => p.page_number === savedPage);
  if (byPageNumber >= 0) return byPageNumber;

  return Math.min(Math.max(savedPage - 1, 0), pages.length - 1);
}
