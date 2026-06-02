export type AchievementMetric =
  | "completed_books"
  | "streak_days"
  | "reading_minutes"
  | "perfect_quiz";

export type AchievementStats = {
  completedBooksCount: number;
  currentStreakDays: number;
  totalReadingMinutes: number;
  hasPerfectQuiz: boolean;
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
  isUnlocked: boolean;
  unlockedAt: string | null;
  progress: AchievementProgress;
};
