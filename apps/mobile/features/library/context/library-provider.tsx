import type { UserBookRecord } from "@readup/db/shared";
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

import { resolveWorkId } from "@/features/library/lib/resolve-work-id";
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
  recordsByWorkId: Map<string, UserBookRecord>;
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
    chapterStableId?: string;
    blockStableId?: string;
  }) => Promise<void>;
  registerEditionMapping: (bookId: string, workId: string) => void;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

function buildWorkMap(records: UserBookRecord[]): Map<string, UserBookRecord> {
  return new Map(records.map((record) => [record.workId, record]));
}

function buildBookMap(
  records: UserBookRecord[],
  editionToWork: Map<string, string>,
): Map<string, UserBookRecord> {
  const byWork = buildWorkMap(records);
  const byBook = new Map<string, UserBookRecord>();

  for (const record of records) {
    byBook.set(record.bookId, record);
  }

  for (const [bookId, workId] of editionToWork) {
    const record = byWork.get(workId);
    if (record) {
      byBook.set(bookId, record);
    }
  }

  return byBook;
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [records, setRecords] = useState<UserBookRecord[]>([]);
  const [editionToWork, setEditionToWork] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const registerEditionMapping = useCallback((bookId: string, workId: string) => {
    setEditionToWork((prev) => {
      if (prev.get(bookId) === workId) return prev;
      const next = new Map(prev);
      next.set(bookId, workId);
      return next;
    });
  }, []);

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

  const applyRecord = useCallback((record: UserBookRecord | null, workId: string) => {
    setRecords((prev) => {
      const without = prev.filter((item) => item.workId !== workId);
      if (!record) return without;
      return [record, ...without];
    });
    if (record) {
      setEditionToWork((prev) => {
        const next = new Map(prev);
        next.set(record.bookId, record.workId);
        return next;
      });
    }
  }, []);

  const toggleSave = useCallback(
    async (bookId: string) => {
      if (!user) return;
      const workId = (await resolveWorkId(bookId)) ?? bookId;
      const current =
        records.find((record) => record.workId === workId) ??
        records.find((record) => record.bookId === bookId) ??
        null;
      const wasSaved = current?.isSaved === true;
      const optimistic: UserBookRecord | null = wasSaved
        ? current?.readingStatus === "not_started"
          ? null
          : { ...current!, isSaved: false }
        : {
            workId,
            bookId,
            isSaved: true,
            readingStatus: current?.readingStatus ?? "not_started",
            progress: current?.progress ?? null,
            updatedAt: new Date().toISOString(),
          };

      applyRecord(optimistic, workId);

      try {
        const result = await toggleSaveService(user.id, bookId, wasSaved);
        applyRecord(result, workId);
      } catch {
        applyRecord(current, workId);
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
      chapterStableId?: string;
      blockStableId?: string;
    }) => {
      const result = await recordReadingSessionService(args);
      if (result) {
        applyRecord(result, result.workId);
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
    const recordsByWorkId = buildWorkMap(records);
    const recordsByBookId = buildBookMap(records, editionToWork);
    return {
      records,
      recordsByWorkId,
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
      registerEditionMapping,
    };
  }, [records, editionToWork, loading, error, refresh, toggleSave, recordReadingSession, registerEditionMapping]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibraryContext(): LibraryContextValue {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error("useLibraryContext must be used within LibraryProvider");
  }
  return context;
}
