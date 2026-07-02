import { useMemo } from "react";

import { useQuotes } from "@/features/quotes/hooks/use-quotes";
import { filterQuotesForChapter } from "@/features/quotes/lib/resolve-quote-navigation";
import type { QuoteRange } from "@/features/quotes/lib/quote-types";

export function useChapterQuotes(
  editionBookId: string | undefined,
  chapterStableId: string | undefined,
  emphasizeQuoteId?: string,
) {
  const { getQuotesForEdition } = useQuotes();

  const chapterQuotes = useMemo(() => {
    if (!editionBookId) return [];
    return filterQuotesForChapter(
      getQuotesForEdition(editionBookId),
      editionBookId,
      chapterStableId,
    );
  }, [editionBookId, chapterStableId, getQuotesForEdition]);

  const highlightsByBlockId = useMemo(() => {
    const map = new Map<string, QuoteRange[]>();
    for (const quote of chapterQuotes) {
      const ranges = map.get(quote.blockStableId) ?? [];
      ranges.push({
        quoteId: quote.id,
        start: quote.startOffset,
        end: quote.endOffset,
        emphasize: emphasizeQuoteId === quote.id,
      });
      map.set(quote.blockStableId, ranges);
    }
    return map;
  }, [chapterQuotes, emphasizeQuoteId]);

  return { chapterQuotes, highlightsByBlockId };
}
