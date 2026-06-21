import type { AchievementDefinition } from "@/features/achievements/definitions";
import type {
  AchievementProgress,
  AchievementStats,
} from "@/features/achievements/types";

export function getMetricValue(
  stats: AchievementStats,
  metric: AchievementDefinition["metric"],
): number {
  switch (metric) {
    case "completed_books":
      return stats.completedBooksCount;
    case "streak_days":
      return stats.currentStreakDays;
    case "reading_minutes":
      return stats.totalReadingMinutes;
    case "perfect_quiz":
      return stats.hasPerfectQuiz ? 1 : 0;
    case "reading_days":
      return stats.totalReadingDays;
    case "best_day_minutes":
      return stats.bestDayMinutes;
  }
}

export function calculateProgress(
  definition: AchievementDefinition,
  stats: AchievementStats,
): AchievementProgress {
  const current = getMetricValue(stats, definition.metric);
  const target = definition.target;
  const percent =
    target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  return { current, target, percent };
}

export function isAchievementUnlocked(
  definition: AchievementDefinition,
  stats: AchievementStats,
  unlockedSlugs: Set<string>,
): boolean {
  if (unlockedSlugs.has(definition.slug)) return true;
  const { current, target } = calculateProgress(definition, stats);
  return current >= target;
}
