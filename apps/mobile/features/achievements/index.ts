export {
  fetchAchievementCatalog,
  fetchBestReadingDayMinutes,
  fetchHasPerfectQuiz,
  fetchUnlockedAchievements,
  type AchievementCatalogItem,
  type AchievementUnlock,
} from "@/features/achievements/api/achievements";
export { ACHIEVEMENT_DEFINITIONS } from "@/features/achievements/definitions";
export {
  calculateProgress,
  getMetricValue,
  isAchievementUnlocked,
} from "@/features/achievements/calculate-progress";
export { buildAchievementViewModels } from "@/features/achievements/build-view-models";
export { AchievementIcon } from "@/features/achievements/components/achievement-icon";
export { AchievementRow } from "@/features/achievements/components/achievement-row";
export { useAchievements } from "@/features/achievements/hooks/use-achievements";
export type {
  AchievementCategory,
  AchievementMetric,
  AchievementProgress,
  AchievementStats,
  AchievementViewModel,
} from "@/features/achievements/types";
