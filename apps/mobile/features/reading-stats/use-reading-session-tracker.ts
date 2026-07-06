import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import {
  consumePendingReadingTime,
  computeMinutesDelta,
  pageForSessionSave,
} from "./reading-stats";

export type RecordReadingSessionFn = (args: {
  bookId: string;
  page: number;
  totalPages: number;
  minutesDelta?: number;
  audioPositionMs?: number;
  chapterStableId?: string;
  blockStableId?: string;
}) => Promise<unknown>;

export type ReadingSessionTrackerConfig = {
  enabled: boolean;
  bookId: string | undefined;
  pageLabel: number;
  totalPages: number;
  chapterStableId?: string;
  recordReadingSession: RecordReadingSessionFn;
};

export function useReadingSessionTracker({
  enabled,
  bookId,
  pageLabel,
  totalPages,
  chapterStableId,
  recordReadingSession,
}: ReadingSessionTrackerConfig) {
  const lastSaveAtRef = useRef(Date.now());
  const pendingElapsedMsRef = useRef(0);
  const lastFlushedPageRef = useRef<number | null>(null);
  const bookCompletedRef = useRef(false);
  const configRef = useRef({
    bookId,
    pageLabel,
    totalPages,
    chapterStableId,
    recordReadingSession,
  });
  configRef.current = { bookId, pageLabel, totalPages, chapterStableId, recordReadingSession };

  const flush = useCallback(
    async (options?: { completing?: boolean; audioPositionMs?: number }) => {
      if (bookCompletedRef.current && options?.completing !== true) return;

      const { bookId: id, pageLabel, totalPages: pages, chapterStableId: stableId, recordReadingSession: record } =
        configRef.current;
      if (!enabled || !id || pages <= 0) return;

      const now = Date.now();
      const elapsedMs = now - lastSaveAtRef.current;
      lastSaveAtRef.current = now;
      const previousPendingElapsedMs = pendingElapsedMsRef.current;
      const pending = consumePendingReadingTime(
        previousPendingElapsedMs,
        elapsedMs,
      );
      pendingElapsedMsRef.current = pending.pendingElapsedMs;
      const minutesDelta = pending.minutesDelta;

      const pageToSave = pageForSessionSave(
        pageLabel,
        pages,
        options?.completing === true,
      );

      const isCompleting = options?.completing === true;
      if (isCompleting) {
        bookCompletedRef.current = true;
      }

      try {
        await record({
          bookId: id,
          page: pageToSave,
          totalPages: pages,
          minutesDelta,
          audioPositionMs: options?.audioPositionMs,
          chapterStableId: stableId,
        });
      } catch (error) {
        pendingElapsedMsRef.current = previousPendingElapsedMs + elapsedMs;
        if (isCompleting) {
          bookCompletedRef.current = false;
        }
        if (isCompleting) throw error;
      }
    },
    [enabled],
  );

  const onPageChange = useCallback(
    (pageIndex: number) => {
      if (!enabled) return;
      if (lastFlushedPageRef.current === pageIndex) return;
      lastFlushedPageRef.current = pageIndex;
      void flush();
    },
    [enabled, flush],
  );

  /** Seed current page without flushing (e.g. after resume). */
  const resetPageTracking = useCallback((pageIndex?: number) => {
    bookCompletedRef.current = false;
    lastFlushedPageRef.current =
      typeof pageIndex === "number" ? pageIndex : null;
    lastSaveAtRef.current = Date.now();
    pendingElapsedMsRef.current = 0;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onAppState = (state: AppStateStatus) => {
      if (state === "background" || state === "inactive") {
        void flush();
      }
    };

    const sub = AppState.addEventListener("change", onAppState);
    return () => {
      sub.remove();
      void flush();
    };
  }, [enabled, flush]);

  return {
    flush,
    onPageChange,
    resetPageTracking,
    computeMinutesDelta,
  };
}
