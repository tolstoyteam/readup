import type { CreateUserQuoteInput, UserQuote } from "@readup/db/shared";

import {
  createQuote as createQuoteRepo,
  deleteQuote as deleteQuoteRepo,
  fetchQuotesForEdition,
  fetchUserQuotes,
} from "@/features/quotes/repository/quotes-repository";

export async function loadUserQuotes(userId: string): Promise<UserQuote[]> {
  return fetchUserQuotes(userId);
}

export async function loadEditionQuotes(
  userId: string,
  editionBookId: string,
): Promise<UserQuote[]> {
  return fetchQuotesForEdition(userId, editionBookId);
}

export async function saveQuote(
  userId: string,
  input: CreateUserQuoteInput,
): Promise<UserQuote> {
  return createQuoteRepo(userId, input);
}

export async function removeQuote(quoteId: string): Promise<void> {
  return deleteQuoteRepo(quoteId);
}

export function sortQuotesNewestFirst(quotes: UserQuote[]): UserQuote[] {
  return [...quotes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
