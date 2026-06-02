import { supabase } from "@/shared/lib/supabase";

export type NotificationPreferences = {
  daily_reminder?: boolean;
  streak_alerts?: boolean;
  new_content?: boolean;
  quiz_reminders?: boolean;
  achievements?: boolean;
};

export type Profile = {
  id: string;
  selected_interests: string[];
  reading_goal: string | null;
  interests_step_done: boolean;
  goal_step_done: boolean;
  is_premium: boolean;
  current_streak_days: number;
  longest_streak_days: number;
  last_read_date: string | null;
  total_books_completed: number;
  total_reading_minutes: number;
  daily_reading_goal_minutes: number;
  notification_preferences: NotificationPreferences;
};

const PROFILE_COLUMNS =
  "id, selected_interests, reading_goal, interests_step_done, goal_step_done, is_premium, current_streak_days, longest_streak_days, last_read_date, total_books_completed, total_reading_minutes, daily_reading_goal_minutes, notification_preferences";

function intish(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeProfile(row: unknown): Profile | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  if (typeof record.id !== "string") return null;

  return {
    id: record.id,
    selected_interests: Array.isArray(record.selected_interests)
      ? record.selected_interests.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    reading_goal:
      typeof record.reading_goal === "string" ? record.reading_goal : null,
    interests_step_done: record.interests_step_done === true,
    goal_step_done: record.goal_step_done === true,
    is_premium: record.is_premium === true,
    current_streak_days: intish(record.current_streak_days),
    longest_streak_days: intish(record.longest_streak_days),
    last_read_date:
      typeof record.last_read_date === "string" ? record.last_read_date : null,
    total_books_completed: intish(record.total_books_completed),
    total_reading_minutes: intish(record.total_reading_minutes),
    daily_reading_goal_minutes: intish(record.daily_reading_goal_minutes, 5),
    notification_preferences:
      record.notification_preferences &&
      typeof record.notification_preferences === "object"
        ? (record.notification_preferences as NotificationPreferences)
        : {},
  };
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return normalizeProfile(data);
}

export async function ensureProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, updated_at: new Date().toISOString() }, { onConflict: "id" })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  const profile = normalizeProfile(data);
  if (!profile) throw new Error("Could not load profile");
  return profile;
}

export async function saveInterests(
  userId: string,
  selectedInterests: string[],
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        selected_interests: selectedInterests,
        interests_step_done: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  const profile = normalizeProfile(data);
  if (!profile) throw new Error("Could not save interests");
  return profile;
}

export async function saveGoal(
  userId: string,
  readingGoal: string | null,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        reading_goal: readingGoal,
        goal_step_done: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  const profile = normalizeProfile(data);
  if (!profile) throw new Error("Could not save goal");
  return profile;
}

export async function saveDailyReadingGoal(
  userId: string,
  minutes: number,
): Promise<Profile> {
  const clamped = Math.max(1, Math.min(120, Math.round(minutes)));
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        daily_reading_goal_minutes: clamped,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw error;
  const profile = normalizeProfile(data);
  if (!profile) throw new Error("Could not save daily goal");
  return profile;
}

export async function saveNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        notification_preferences: preferences,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw error;
  const profile = normalizeProfile(data);
  if (!profile) throw new Error("Could not save notification preferences");
  return profile;
}

export type { AchievementUnlock } from "@/features/achievements/api/achievements";
export { fetchUnlockedAchievements } from "@/features/achievements/api/achievements";

export type ReadingDailyLogEntry = {
  date: string;
  minutes: number;
  booksTouched: number;
};

export async function fetchReadingDailyLog(
  userId: string,
  days = 14,
): Promise<ReadingDailyLogEntry[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const { data, error } = await supabase
    .from("reading_daily_log")
    .select("activity_date, minutes_read, books_touched")
    .eq("user_id", userId)
    .gte("activity_date", since.toISOString().slice(0, 10))
    .order("activity_date", { ascending: true });
  if (error) {
    if (__DEV__) console.warn("[fetchReadingDailyLog]", error.message);
    return [];
  }
  return (data ?? [])
    .map((row) => {
      const record = row as {
        activity_date: string;
        minutes_read: number;
        books_touched: number;
      };
      return {
        date: record.activity_date,
        minutes: intish(record.minutes_read),
        booksTouched: intish(record.books_touched),
      };
    });
}
