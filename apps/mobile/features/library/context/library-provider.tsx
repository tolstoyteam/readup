import type { UserBookRecord } from "@readup/db";
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
  getCompletedBooks,
  getContinueBook,
  getInProgressBooks,
  getSavedBooks,
  loadLibrary,
  recordReadingSession as recordReadingSessionService,
  toggleSave as toggleSaveService,
} from "@/features/library/services/library-service";
import { notifyEngagementRefresh } from "@/features/engagement/engagement-refresh";
import { useAuth } from "@/shared/context/auth-context";

type LibraryContextValue = {
  records: UserBookRecord[];
  recordsByBookId: Map<string, UserBookRecord>;
  loading: boolean;
  error: string | null;
  savedBooks: UserBookRecord[];
  inProgressBooks: UserBookRecord[];
  completedBooks: UserBookRecord[];
  continueBook: UserBookRecord | null;
  refresh: () => Promise<void>;
  toggleSave: (bookId: string) => Promise<void>;
  recordReadingSession: (args: {
    bookId: string;
    page: number;
    totalPages: number;
    minutesDelta?: number;
    audioPositionMs?: number;
  }) => Promise<void>;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

function recordsToMap(records: UserBookRecord[]): Map<string, UserBookRecord> {
  return new Map(records.map((record) => [record.bookId, record]));
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [records, setRecords] = useState<UserBookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const next = await loadLibrary(user.id);
      setRecords(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load library");
      setRecords([]);
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

  const applyRecord = useCallback((record: UserBookRecord | null, bookId: string) => {
    setRecords((prev) => {
      const without = prev.filter((item) => item.bookId !== bookId);
      if (!record) return without;
      return [record, ...without];
    });
  }, []);

  const toggleSave = useCallback(
    async (bookId: string) => {
      if (!user) return;
      const current = records.find((record) => record.bookId === bookId);
      const wasSaved = current?.isSaved === true;
      const optimistic: UserBookRecord | null = wasSaved
        ? current?.readingStatus === "not_started"
          ? null
          : { ...current!, isSaved: false }
        : {
            bookId,
            isSaved: true,
            readingStatus: current?.readingStatus ?? "not_started",
            progress: current?.progress ?? null,
            updatedAt: new Date().toISOString(),
          };

      applyRecord(optimistic, bookId);

      try {
        const result = await toggleSaveService(user.id, bookId, wasSaved);
        applyRecord(result, bookId);
      } catch {
        applyRecord(current ?? null, bookId);
        throw new Error("Could not update saved state");
      }
    },
    [applyRecord, records, user],
  );

  const recordReadingSession = useCallback(
    async (args: {
      bookId: string;
      page: number;
      totalPages: number;
      minutesDelta?: number;
      audioPositionMs?: number;
    }) => {
      const result = await recordReadingSessionService(args);
      if (result) {
        applyRecord(result, args.bookId);
        if (result.readingStatus === "completed") {
          notifyEngagementRefresh();
        }
      } else {
        throw new Error("Could not save reading session");
      }
    },
    [applyRecord],
  );

  const value = useMemo<LibraryContextValue>(() => {
    const recordsByBookId = recordsToMap(records);
    return {
      records,
      recordsByBookId,
      loading,
      error,
      savedBooks: getSavedBooks(records),
      inProgressBooks: getInProgressBooks(records),
      completedBooks: getCompletedBooks(records),
      continueBook: getContinueBook(records),
      refresh,
      toggleSave,
      recordReadingSession,
    };
  }, [records, loading, error, refresh, toggleSave, recordReadingSession]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibraryContext(): LibraryContextValue {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error("useLibraryContext must be used within LibraryProvider");
  }
  return context;
}
