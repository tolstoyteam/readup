import { supabase } from "@/shared/lib/supabase";
import { emptyDraft, parseDraft, type OnboardingDraft, type OnboardingState } from "../lib/onboarding-draft";

export type AccountOnboarding = { draft: OnboardingDraft; revision: number };

type Row = {
  user_id: string; state: OnboardingState; challenge: string | null; goals: string[];
  learning_formats: string[]; monthly_goal: number | null; streak_goal: number | null;
  reading_time: string | null; reminder_time: string | null; revision: number;
};

function fromRow(row: Row): AccountOnboarding {
  return {
    draft: parseDraft({
      ...emptyDraft(), state: row.state, challenge: row.challenge, goals: row.goals,
      learningFormats: row.learning_formats, monthlyGoal: row.monthly_goal,
      streakGoal: row.streak_goal, readingTime: row.reading_time, reminderTime: row.reminder_time,
    }) ?? emptyDraft(),
    revision: row.revision,
  };
}

function toRow(userId: string, draft: OnboardingDraft) {
  return {
    user_id: userId, state: draft.state, challenge: draft.challenge, goals: draft.goals,
    learning_formats: draft.learningFormats, monthly_goal: draft.monthlyGoal,
    streak_goal: draft.streakGoal, reading_time: draft.readingTime, reminder_time: draft.reminderTime,
  };
}

export async function fetchAccountOnboarding(userId: string): Promise<AccountOnboarding | null> {
  const { data, error } = await supabase.from("user_onboarding").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as Row) : null;
}

// A conflict means a record was created elsewhere. Fetch it; never overwrite it.
export async function attachGuestDraft(userId: string, draft: OnboardingDraft): Promise<AccountOnboarding> {
  const { error } = await supabase.from("user_onboarding").upsert(toRow(userId, draft), {
    onConflict: "user_id", ignoreDuplicates: true,
  });
  if (error) throw error;
  const record = await fetchAccountOnboarding(userId);
  if (!record) throw new Error("Onboarding record missing after insert");
  return record;
}

export async function updateAccountOnboarding(userId: string, draft: OnboardingDraft, revision: number): Promise<AccountOnboarding | null> {
  const { data, error } = await supabase.from("user_onboarding")
    .update({ ...toRow(userId, draft), revision: revision + 1, updated_at: new Date().toISOString() })
    .eq("user_id", userId).eq("revision", revision).select("*").maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as Row) : null;
}
