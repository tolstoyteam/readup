import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { pageForSessionSave } from "./reading-stats";

const MIN_FLUSH_SECONDS = 30;
const MAX_MINUTES_PER_FLUSH = 30;

export type RecordReadingSessionFn = (args: {
  bookId: string;
  page: number;
  totalPages: number;
  minutesDelta?: number;
  audioPositionMs?: number;
}) => Promise<unknown>;

export type ReadingSessionTrackerConfig = {
  enabled: boolean;
  bookId: string | undefined;
  pageLabel: number;
  totalPages: number;
  recordReadingSession: RecordReadingSessionFn;
};

export function computeMinutesDelta(elapsedMs: number): number {
  if (elapsedMs < MIN_FLUSH_SECONDS * 1000) return 0;
  return Math.min(
    MAX_MINUTES_PER_FLUSH,
    Math.max(1, Math.round(elapsedMs / 60_000)),
  );
}

export function useReadingSessionTracker({
  enabled,
  bookId,
  pageLabel,
  totalPages,
  recordReadingSession,
}: ReadingSessionTrackerConfig) {
  const lastSaveAtRef = useRef(Date.now());
  const lastFlushedPageRef = useRef<number | null>(null);
  const bookCompletedRef = useRef(false);
  const configRef = useRef({ bookId, pageLabel, totalPages, recordReadingSession });
  configRef.current = { bookId, pageLabel, totalPages, recordReadingSession };

  const flush = useCallback(
    async (options?: { completing?: boolean; audioPositionMs?: number }) => {
      if (bookCompletedRef.current && options?.completing !== true) return;

      const { bookId: id, pageLabel, totalPages: pages, recordReadingSession: record } =
        configRef.current;
      if (!enabled || !id || pages <= 0) return;

      const now = Date.now();
      const minutesDelta = computeMinutesDelta(now - lastSaveAtRef.current);
      lastSaveAtRef.current = now;

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
        });
      } catch (error) {
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
