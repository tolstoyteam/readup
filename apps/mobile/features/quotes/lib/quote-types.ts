import type { CreateUserQuoteInput, UserQuote } from "@readup/db/shared";

export type { CreateUserQuoteInput, UserQuote };

export type QuoteRange = {
  quoteId: string;
  start: number;
  end: number;
  emphasize?: boolean;
};

export type QuoteListItem = UserQuote & {
  bookTitle?: string;
};

export type TextSelectionState = {
  blockStableId: string;
  start: number;
  end: number;
  selectedText: string;
};
