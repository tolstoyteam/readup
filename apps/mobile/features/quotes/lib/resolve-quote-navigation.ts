import type { BookPage } from "@readup/db/shared";
import type { UserQuote } from "@readup/db/shared";

export function resolveQuotePageIndex(
  quote: Pick<UserQuote, "chapterStableId" | "pageNumber">,
  pages: BookPage[],
): number {
  if (pages.length === 0) return 0;

  const byStableId = pages.findIndex(
    (page) => page.chapter_stable_id === quote.chapterStableId,
  );
  if (byStableId >= 0) return byStableId;

  const byPageNumber = pages.findIndex(
    (page) => page.page_number === quote.pageNumber,
  );
  if (byPageNumber >= 0) return byPageNumber;

  return Math.min(Math.max(quote.pageNumber - 1, 0), pages.length - 1);
}

export function groupQuotesByBlockId(
  quotes: UserQuote[],
): Map<string, UserQuote[]> {
  const map = new Map<string, UserQuote[]>();
  for (const quote of quotes) {
    const existing = map.get(quote.blockStableId) ?? [];
    existing.push(quote);
    map.set(quote.blockStableId, existing);
  }
  return map;
}

export function filterQuotesForChapter(
  quotes: UserQuote[],
  editionBookId: string,
  chapterStableId?: string,
): UserQuote[] {
  const numericEditionId = Number(editionBookId);
  return quotes.filter((quote) => {
    if (quote.editionBookId !== numericEditionId) return false;
    if (!chapterStableId) return true;
    return quote.chapterStableId === chapterStableId;
  });
}
