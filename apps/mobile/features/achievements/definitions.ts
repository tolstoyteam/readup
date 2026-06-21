import type {
  AchievementCategory,
  AchievementMetric,
} from "@/features/achievements/types";

export type AchievementDefinition = {
  slug: string;
  sortOrder: number;
  target: number;
  metric: AchievementMetric;
  category: AchievementCategory;
  icon: string;
  title: string;
  description: string;
};

/**
 * Single client-side source of truth for thresholds and metrics.
 * Mirrors the server catalog (packages/db/sql/supabase-achievements-seed.sql),
 * whose metric/threshold columns drive _maybe_unlock_achievements.
 */
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Streak (consecutive days)
  {
    slug: "streak_3",
    sortOrder: 100,
    target: 3,
    metric: "streak_days",
    category: "streak",
    icon: "Flame",
    title: "Три дня подряд",
    description: "Читайте три дня без перерыва",
  },
  {
    slug: "streak_7",
    sortOrder: 110,
    target: 7,
    metric: "streak_days",
    category: "streak",
    icon: "Trophy",
    title: "Неделя дисциплины",
    description: "Читайте семь дней без перерыва",
  },
  {
    slug: "streak_14",
    sortOrder: 120,
    target: 14,
    metric: "streak_days",
    category: "streak",
    icon: "Award",
    title: "Две недели подряд",
    description: "Читайте 14 дней без перерыва",
  },
  {
    slug: "streak_30",
    sortOrder: 130,
    target: 30,
    metric: "streak_days",
    category: "streak",
    icon: "Medal",
    title: "Месяц дисциплины",
    description: "Читайте 30 дней без перерыва",
  },
  {
    slug: "streak_100",
    sortOrder: 140,
    target: 100,
    metric: "streak_days",
    category: "streak",
    icon: "Crown",
    title: "Сто дней подряд",
    description: "Читайте 100 дней без перерыва",
  },

  // Books completed (completed only)
  {
    slug: "first_book_completed",
    sortOrder: 200,
    target: 1,
    metric: "completed_books",
    category: "books",
    icon: "BookOpen",
    title: "Первая книга",
    description: "Завершите свою первую книгу",
  },
  {
    slug: "three_books_completed",
    sortOrder: 210,
    target: 3,
    metric: "completed_books",
    category: "books",
    icon: "BookMarked",
    title: "Три книги",
    description: "Завершите три книги",
  },
  {
    slug: "five_books_completed",
    sortOrder: 220,
    target: 5,
    metric: "completed_books",
    category: "books",
    icon: "BookCopy",
    title: "Пять книг",
    description: "Завершите пять книг",
  },
  {
    slug: "ten_books_completed",
    sortOrder: 230,
    target: 10,
    metric: "completed_books",
    category: "books",
    icon: "Library",
    title: "Десять книг",
    description: "Завершите десять книг",
  },
  {
    slug: "twenty_five_books_completed",
    sortOrder: 240,
    target: 25,
    metric: "completed_books",
    category: "books",
    icon: "Award",
    title: "Двадцать пять книг",
    description: "Завершите 25 книг",
  },
  {
    slug: "fifty_books_completed",
    sortOrder: 250,
    target: 50,
    metric: "completed_books",
    category: "books",
    icon: "Crown",
    title: "Пятьдесят книг",
    description: "Завершите 50 книг",
  },

  // Total reading time (cumulative minutes)
  {
    slug: "reading_time_60",
    sortOrder: 300,
    target: 60,
    metric: "reading_minutes",
    category: "reading_time",
    icon: "Clock",
    title: "Час за чтением",
    description: "Прочитайте 60 минут суммарно",
  },
  {
    slug: "reading_time_300",
    sortOrder: 310,
    target: 300,
    metric: "reading_minutes",
    category: "reading_time",
    icon: "Clock",
    title: "Пять часов",
    description: "Прочитайте 300 минут суммарно",
  },
  {
    slug: "reading_time_1000",
    sortOrder: 320,
    target: 1000,
    metric: "reading_minutes",
    category: "reading_time",
    icon: "Hourglass",
    title: "Тысяча минут",
    description: "Прочитайте 1000 минут суммарно",
  },
  {
    slug: "reading_time_5000",
    sortOrder: 330,
    target: 5000,
    metric: "reading_minutes",
    category: "reading_time",
    icon: "Trophy",
    title: "Книжный марафон",
    description: "Прочитайте 5000 минут суммарно",
  },

  // Daily reading (best single day)
  {
    slug: "daily_minutes_10",
    sortOrder: 400,
    target: 10,
    metric: "best_day_minutes",
    category: "daily",
    icon: "Timer",
    title: "Разминка",
    description: "Прочитайте 10 минут за один день",
  },
  {
    slug: "daily_minutes_30",
    sortOrder: 410,
    target: 30,
    metric: "best_day_minutes",
    category: "daily",
    icon: "Timer",
    title: "Полчаса в день",
    description: "Прочитайте 30 минут за один день",
  },
  {
    slug: "daily_minutes_60",
    sortOrder: 420,
    target: 60,
    metric: "best_day_minutes",
    category: "daily",
    icon: "Zap",
    title: "Час за день",
    description: "Прочитайте 60 минут за один день",
  },
  {
    slug: "daily_minutes_120",
    sortOrder: 430,
    target: 120,
    metric: "best_day_minutes",
    category: "daily",
    icon: "Zap",
    title: "Глубокое погружение",
    description: "Прочитайте 120 минут за один день",
  },

  // Activity
  {
    slug: "quiz_perfect",
    sortOrder: 500,
    target: 1,
    metric: "perfect_quiz",
    category: "activity",
    icon: "Sparkles",
    title: "Идеальный тест",
    description: "Ответьте на все вопросы теста верно",
  },
  {
    slug: "reading_days_10",
    sortOrder: 510,
    target: 10,
    metric: "reading_days",
    category: "activity",
    icon: "CalendarCheck",
    title: "Десять дней чтения",
    description: "Читайте в течение 10 дней",
  },
  {
    slug: "reading_days_50",
    sortOrder: 520,
    target: 50,
    metric: "reading_days",
    category: "activity",
    icon: "CalendarDays",
    title: "Пятьдесят дней чтения",
    description: "Читайте в течение 50 дней",
  },
];

export const ACHIEVEMENT_DEFINITION_BY_SLUG = new Map(
  ACHIEVEMENT_DEFINITIONS.map((def) => [def.slug, def]),
);
