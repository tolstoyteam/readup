import type { UserQuote } from "@readup/db/shared";

export function parseFocusQuoteIdParam(
  raw: string | string[] | undefined,
): string | undefined {
  if (!raw) return undefined;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function isQuoteSourceNavigation(args: {
  focusQuoteId?: string;
  quoteSourceSession: boolean;
}): boolean {
  return args.quoteSourceSession || !!args.focusQuoteId;
}

export function shouldSuppressEditionRedirect(args: {
  quoteSourceSession: boolean;
  focusQuoteId?: string;
}): boolean {
  return isQuoteSourceNavigation(args);
}

export function quoteSourceReaderPath(
  quote: Pick<UserQuote, "id" | "editionBookId">,
): string {
  return `/reader/${encodeURIComponent(String(quote.editionBookId))}?focusQuoteId=${encodeURIComponent(quote.id)}`;
}

export function quoteEditionMatchesDocument(
  quote: Pick<UserQuote, "editionBookId"> | null | undefined,
  documentBookId: string | undefined,
): boolean {
  if (!quote || !documentBookId) return false;
  return quote.editionBookId === Number(documentBookId);
}

export function logQuoteSourceNavigation(
  event: string,
  details: Record<string, unknown>,
): void {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.log(`[QuoteSource] ${event}`, details);
  }
}
