import { supabase } from "@/shared/lib/supabase";

export type AchievementCatalogItem = {
  id: number;
  slug: string;
  title: string;
  description: string;
  icon: string;
  sortOrder: number;
};

export type AchievementUnlock = {
  id: number;
  slug: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
};

export async function fetchAchievementCatalog(): Promise<AchievementCatalogItem[]> {
  const { data, error } = await supabase
    .from("achievements")
    .select("id, slug, title, description, icon, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    if (__DEV__) console.warn("[fetchAchievementCatalog]", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const record = row as {
      id: number;
      slug: string;
      title: string;
      description: string;
      icon: string;
      sort_order: number;
    };
    return {
      id: record.id,
      slug: record.slug,
      title: record.title,
      description: record.description,
      icon: record.icon,
      sortOrder: record.sort_order,
    };
  });
}

export async function fetchUnlockedAchievements(
  userId: string,
): Promise<AchievementUnlock[]> {
  const { data, error } = await supabase
    .from("user_achievements")
    .select(
      "unlocked_at, achievement:achievements(id, slug, title, description, icon, sort_order)",
    )
    .eq("user_id", userId);

  if (error) {
    if (__DEV__) console.warn("[fetchUnlockedAchievements]", error.message);
    return [];
  }

  type AchievementRow = {
    id: number;
    slug: string;
    title: string;
    description: string;
    icon: string;
    sort_order: number;
  };

  return (data ?? [])
    .map((row) => {
      const record = row as unknown as {
        unlocked_at: string | null;
        achievement?: AchievementRow | AchievementRow[] | null;
      };
      const achievement = Array.isArray(record.achievement)
        ? record.achievement[0]
        : record.achievement;
      if (!achievement) return null;
      return {
        id: achievement.id,
        slug: achievement.slug,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        unlockedAt: record.unlocked_at,
      };
    })
    .filter((row): row is AchievementUnlock => !!row);
}

export async function fetchBestReadingDayMinutes(
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("reading_daily_log")
    .select("minutes_read")
    .eq("user_id", userId)
    .order("minutes_read", { ascending: false })
    .limit(1);

  if (error) {
    if (__DEV__) console.warn("[fetchBestReadingDayMinutes]", error.message);
    return 0;
  }

  const minutes = (data ?? [])[0]?.minutes_read;
  return typeof minutes === "number" && Number.isFinite(minutes) ? minutes : 0;
}

export async function fetchHasPerfectQuiz(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_quiz_attempts")
    .select("score, total_questions")
    .eq("user_id", userId)
    .gt("total_questions", 0)
    .limit(50);

  if (error) {
    if (__DEV__) console.warn("[fetchHasPerfectQuiz]", error.message);
    return false;
  }

  return (data ?? []).some(
    (row) =>
      row.score === row.total_questions &&
      (row.total_questions as number) > 0,
  );
}
