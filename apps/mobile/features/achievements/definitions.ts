import type { AchievementMetric } from "@/features/achievements/types";

export type AchievementDefinition = {
  slug: string;
  sortOrder: number;
  target: number;
  metric: AchievementMetric;
  icon: string;
  title: string;
  description: string;
};

/** Thresholds and metrics mirrored from server unlock logic. */
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    slug: "first_book_completed",
    sortOrder: 10,
    target: 1,
    metric: "completed_books",
    icon: "BookOpen",
    title: "Первая книга",
    description: "Завершите свою первую книгу",
  },
  {
    slug: "five_books_completed",
    sortOrder: 20,
    target: 5,
    metric: "completed_books",
    icon: "BookMarked",
    title: "Пять книг",
    description: "Завершите пять книг",
  },
  {
    slug: "streak_3",
    sortOrder: 30,
    target: 3,
    metric: "streak_days",
    icon: "Flame",
    title: "Три дня подряд",
    description: "Читайте три дня без перерыва",
  },
  {
    slug: "streak_7",
    sortOrder: 40,
    target: 7,
    metric: "streak_days",
    icon: "Trophy",
    title: "Неделя дисциплины",
    description: "Семь дней подряд",
  },
  {
    slug: "quiz_perfect",
    sortOrder: 50,
    target: 1,
    metric: "perfect_quiz",
    icon: "Sparkles",
    title: "Идеальный тест",
    description: "Ответьте на все вопросы теста верно",
  },
  {
    slug: "reading_time_60",
    sortOrder: 60,
    target: 60,
    metric: "reading_minutes",
    icon: "Clock",
    title: "Час за чтением",
    description: "Прочитайте 60 минут суммарно",
  },
];

export const ACHIEVEMENT_DEFINITION_BY_SLUG = new Map(
  ACHIEVEMENT_DEFINITIONS.map((def) => [def.slug, def]),
);
