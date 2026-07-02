import type { CreateUserQuoteInput, UserQuote } from "@readup/db";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

import {
  loadEditionQuotes,
  loadUserQuotes,
  removeQuote,
  saveQuote,
  sortQuotesNewestFirst,
} from "@/features/quotes/services/quotes-service";
import { useAuth } from "@/shared/context/auth-context";

type QuotesContextValue = {
  quotes: UserQuote[];
  quotesById: Map<string, UserQuote>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveQuote: (input: CreateUserQuoteInput) => Promise<UserQuote>;
  deleteQuote: (quoteId: string) => Promise<void>;
  getQuotesForEdition: (editionBookId: string) => UserQuote[];
};

const QuotesContext = createContext<QuotesContextValue | null>(null);

export function QuotesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<UserQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setQuotes([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const next = sortQuotesNewestFirst(await loadUserQuotes(user.id));
      setQuotes(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load quotes");
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && user) {
        void refresh();
      }
    });
    return () => subscription.remove();
  }, [refresh, user]);

  const saveQuoteAction = useCallback(
    async (input: CreateUserQuoteInput) => {
      if (!user) {
        throw new Error("Sign in to save quotes.");
      }

      const optimisticId = `optimistic-${Date.now()}`;
      const optimistic: UserQuote = {
        id: optimisticId,
        userId: user.id,
        ...input,
        createdAt: new Date().toISOString(),
      };

      setQuotes((prev) => sortQuotesNewestFirst([optimistic, ...prev]));

      try {
        const saved = await saveQuote(user.id, input);
        setQuotes((prev) =>
          sortQuotesNewestFirst(
            prev.map((quote) => (quote.id === optimisticId ? saved : quote)),
          ),
        );
        return saved;
      } catch (saveError) {
        setQuotes((prev) => prev.filter((quote) => quote.id !== optimisticId));
        throw saveError;
      }
    },
    [user],
  );

  const deleteQuoteAction = useCallback(async (quoteId: string) => {
    const previous = quotes;
    setQuotes((prev) => prev.filter((quote) => quote.id !== quoteId));

    try {
      await removeQuote(quoteId);
    } catch (deleteError) {
      setQuotes(previous);
      throw deleteError;
    }
  }, [quotes]);

  const quotesById = useMemo(
    () => new Map(quotes.map((quote) => [quote.id, quote])),
    [quotes],
  );

  const getQuotesForEdition = useCallback(
    (editionBookId: string) => {
      const numericId = Number(editionBookId);
      if (!Number.isFinite(numericId)) return [];
      return quotes.filter((quote) => quote.editionBookId === numericId);
    },
    [quotes],
  );

  const value = useMemo<QuotesContextValue>(
    () => ({
      quotes,
      quotesById,
      loading,
      error,
      refresh,
      saveQuote: saveQuoteAction,
      deleteQuote: deleteQuoteAction,
      getQuotesForEdition,
    }),
    [
      quotes,
      quotesById,
      loading,
      error,
      refresh,
      saveQuoteAction,
      deleteQuoteAction,
      getQuotesForEdition,
    ],
  );

  return <QuotesContext.Provider value={value}>{children}</QuotesContext.Provider>;
}

export function useQuotesContext(): QuotesContextValue {
  const context = useContext(QuotesContext);
  if (!context) {
    throw new Error("useQuotesContext must be used within QuotesProvider");
  }
  return context;
}

/** Preload edition quotes when opening reader (ensures cache is warm). */
export async function preloadEditionQuotes(
  userId: string,
  editionBookId: string,
): Promise<UserQuote[]> {
  return loadEditionQuotes(userId, editionBookId);
}
