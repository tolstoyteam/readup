import type { Profile } from "@/features/profile/api/profile";

import { daysBetweenUtcDates } from "./activity-date";

const MIN_FLUSH_SECONDS = 30;
const MAX_MINUTES_PER_FLUSH = 30;

export type ReadingStatsSnapshot = {
  currentStreakDays: number;
  longestStreakDays: number;
  totalReadingDays: number;
  totalBooksCompleted: number;
  totalReadingMinutes: number;
};

export function getEffectiveCurrentStreak(
  profile: Pick<Profile, "current_streak_days" | "last_read_date"> | null,
  todayKey: string,
): number {
  if (!profile?.last_read_date) return 0;
  const gap = daysBetweenUtcDates(profile.last_read_date, todayKey);
  if (gap > 1) return 0;
  return profile.current_streak_days;
}

export function isDateInStreakWindow(
  dayKey: string,
  lastReadDate: string | null,
  currentStreakDays: number,
): boolean {
  if (!lastReadDate || currentStreakDays <= 0) return false;
  const daysFromLastRead = daysBetweenUtcDates(dayKey, lastReadDate);
  return daysFromLastRead >= 0 && daysFromLastRead < currentStreakDays;
}

export function isStreakActiveToday(
  lastReadDate: string | null,
  todayKey: string,
): boolean {
  return lastReadDate === todayKey;
}

export function getTotalReadingDays(
  profile: Pick<Profile, "total_reading_days"> | null,
  logDayCount?: number,
): number {
  if (profile && profile.total_reading_days > 0) {
    return profile.total_reading_days;
  }
  return logDayCount ?? 0;
}

export function buildReadingStatsSnapshot(
  profile: Profile | null,
  todayKey: string,
  logDayCount?: number,
): ReadingStatsSnapshot {
  return {
    currentStreakDays: getEffectiveCurrentStreak(profile, todayKey),
    longestStreakDays: profile?.longest_streak_days ?? 0,
    totalReadingDays: getTotalReadingDays(profile, logDayCount),
    totalBooksCompleted: profile?.total_books_completed ?? 0,
    totalReadingMinutes: profile?.total_reading_minutes ?? 0,
  };
}

/** Page sent to RPC: avoid auto-complete until user explicitly finishes. */
export function pageForSessionSave(
  pageLabel: number,
  totalPages: number,
  completing: boolean,
): number {
  if (completing && totalPages > 0) return totalPages;
  if (totalPages > 0 && pageLabel >= totalPages) {
    return Math.max(totalPages - 1, 1);
  }
  return Math.max(pageLabel, 1);
}

export function computeMinutesDelta(elapsedMs: number): number {
  if (elapsedMs < MIN_FLUSH_SECONDS * 1000) return 0;
  return Math.min(
    MAX_MINUTES_PER_FLUSH,
    Math.max(1, Math.round(elapsedMs / 60_000)),
  );
}

export function consumePendingReadingTime(
  pendingElapsedMs: number,
  elapsedMs: number,
): { minutesDelta: number; pendingElapsedMs: number } {
  const totalElapsedMs = Math.max(0, pendingElapsedMs) + Math.max(0, elapsedMs);
  const minutesDelta = computeMinutesDelta(totalElapsedMs);

  if (minutesDelta <= 0) {
    return { minutesDelta: 0, pendingElapsedMs: totalElapsedMs };
  }

  return {
    minutesDelta,
    pendingElapsedMs: Math.max(0, totalElapsedMs - minutesDelta * 60_000),
  };
}
