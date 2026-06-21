export type AchievementMetric =
  | "completed_books"
  | "streak_days"
  | "reading_minutes"
  | "perfect_quiz"
  | "reading_days"
  | "best_day_minutes";

export type AchievementCategory =
  | "streak"
  | "books"
  | "reading_time"
  | "daily"
  | "activity";

export type AchievementStats = {
  completedBooksCount: number;
  currentStreakDays: number;
  totalReadingMinutes: number;
  hasPerfectQuiz: boolean;
  totalReadingDays: number;
  bestDayMinutes: number;
};

export type AchievementProgress = {
  current: number;
  target: number;
  percent: number;
};

export type AchievementViewModel = {
  id: number;
  slug: string;
  title: string;
  description: string;
  icon: string;
  sortOrder: number;
  category: AchievementCategory;
  isUnlocked: boolean;
  unlockedAt: string | null;
  progress: AchievementProgress;
};
