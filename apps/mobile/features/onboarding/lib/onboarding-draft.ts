import AsyncStorage from "@react-native-async-storage/async-storage";

export type OnboardingState = "in_progress" | "completed" | "legacy";
export type OnboardingDraft = {
  version: 1;
  state: OnboardingState;
  challenge: string | null;
  goals: string[];
  learningFormats: string[];
  monthlyGoal: number | null;
  streakGoal: number | null;
  readingTime: string | null;
  reminderTime: string | null;
};

export const emptyDraft = (): OnboardingDraft => ({
  version: 1,
  state: "in_progress",
  challenge: null,
  goals: [],
  learningFormats: [],
  monthlyGoal: null,
  streakGoal: null,
  readingTime: null,
  reminderTime: null,
});

const GUEST_KEY = "@readup/onboarding/v1/guest";
const accountKey = (userId: string) => `@readup/onboarding/v1/user/${userId}`;
const pendingKey = (userId: string) => `@readup/onboarding/v1/pending/${userId}`;
const validString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;
const validList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const validNumber = (value: unknown, min: number, max: number): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : null;

export function parseDraft(value: unknown): OnboardingDraft | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1) return null;
  return {
    version: 1,
    state: raw.state === "completed" || raw.state === "legacy" ? raw.state : "in_progress",
    challenge: validString(raw.challenge),
    goals: validList(raw.goals).slice(0, 3),
    learningFormats: validList(raw.learningFormats),
    monthlyGoal: validNumber(raw.monthlyGoal, 1, 50),
    streakGoal: validNumber(raw.streakGoal, 1, 365),
    readingTime: validString(raw.readingTime),
    reminderTime: typeof raw.reminderTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.reminderTime) ? raw.reminderTime : null,
  };
}

export function nextOnboardingRoute(draft: OnboardingDraft): string | null {
  if (draft.state !== "in_progress") return null;
  if (!draft.challenge) return "/onboarding";
  if (draft.goals.length === 0) return "/onboarding/goals";
  if (draft.learningFormats.length === 0) return "/onboarding/learning";
  if (draft.monthlyGoal == null) return "/onboarding/monthly-goal";
  if (draft.streakGoal == null) return "/onboarding/streak-goal";
  if (!draft.readingTime) return "/onboarding/reading-time";
  return "/onboarding/reminder-time";
}

async function read(key: string): Promise<OnboardingDraft | null> {
  const value = await AsyncStorage.getItem(key);
  if (!value) return null;
  try { return parseDraft(JSON.parse(value)); } catch { return null; }
}

export const readGuestDraft = () => read(GUEST_KEY);
export const readAccountDraft = (userId: string) => read(accountKey(userId));
export const saveGuestDraft = (draft: OnboardingDraft) => AsyncStorage.setItem(GUEST_KEY, JSON.stringify(draft));
export const saveAccountDraft = (userId: string, draft: OnboardingDraft) => AsyncStorage.setItem(accountKey(userId), JSON.stringify(draft));
export const clearGuestDraft = () => AsyncStorage.removeItem(GUEST_KEY);
export async function readPendingDraft(userId: string): Promise<{ revision: number; draft: OnboardingDraft } | null> {
  const raw = await AsyncStorage.getItem(pendingKey(userId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { revision?: unknown; draft?: unknown };
    const draft = parseDraft(parsed.draft);
    return draft && typeof parsed.revision === "number" ? { revision: parsed.revision, draft } : null;
  } catch { return null; }
}
export const savePendingDraft = (userId: string, revision: number, draft: OnboardingDraft) =>
  AsyncStorage.setItem(pendingKey(userId), JSON.stringify({ revision, draft }));
export const clearPendingDraft = (userId: string) => AsyncStorage.removeItem(pendingKey(userId));
