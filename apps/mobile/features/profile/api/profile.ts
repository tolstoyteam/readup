import { supabase } from "@/shared/lib/supabase";

export type Profile = {
  id: string;
  selected_interests: string[];
  reading_goal: string | null;
  interests_step_done: boolean;
  goal_step_done: boolean;
};

const PROFILE_COLUMNS =
  "id, selected_interests, reading_goal, interests_step_done, goal_step_done";

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
