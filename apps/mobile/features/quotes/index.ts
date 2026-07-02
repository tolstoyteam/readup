export { QuotesProvider, useQuotesContext } from "@/features/quotes/context/quotes-provider";
export { useQuotes } from "@/features/quotes/hooks/use-quotes";
export { useChapterQuotes } from "@/features/quotes/hooks/use-chapter-quotes";
export type {
  QuoteListItem,
  QuoteRange,
  TextSelectionState,
} from "@/features/quotes/lib/quote-types";
export { buildHighlightSegments } from "@/features/quotes/lib/build-highlight-segments";
export {
  filterQuotesForChapter,
  groupQuotesByBlockId,
  resolveQuotePageIndex,
} from "@/features/quotes/lib/resolve-quote-navigation";
