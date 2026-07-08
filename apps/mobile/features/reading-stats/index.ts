export {
  todayActivityDateKey,
  daysBetweenUtcDates,
  generateLastNDays,
} from "./activity-date";
export {
  buildReadingStatsSnapshot,
  computeMinutesDelta,
  consumePendingReadingTime,
  getEffectiveCurrentStreak,
  getTotalReadingDays,
  isDateInStreakWindow,
  pageForSessionSave,
  type ReadingStatsSnapshot,
} from "./reading-stats";
export {
  useReadingSessionTracker,
  type RecordReadingSessionFn,
} from "./use-reading-session-tracker";
export { useReadingStats, type UseReadingStatsResult } from "./use-reading-stats";
