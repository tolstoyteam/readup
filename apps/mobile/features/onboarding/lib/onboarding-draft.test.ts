import assert from "node:assert/strict";
import test from "node:test";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearGuestDraft, emptyDraft, nextOnboardingRoute, parseDraft,
  readAccountDraft, readGuestDraft, saveAccountDraft, saveGuestDraft,
} from "./onboarding-draft";

test("partial answers resume at the first unanswered question", () => {
  const draft = emptyDraft();
  assert.equal(nextOnboardingRoute(draft), "/onboarding");
  draft.challenge = "consistency";
  assert.equal(nextOnboardingRoute(draft), "/onboarding/goals");
  draft.goals = ["reading"];
  draft.learningFormats = ["reading"];
  draft.monthlyGoal = 4;
  draft.streakGoal = 14;
  draft.readingTime = "bedtime";
  assert.equal(nextOnboardingRoute(draft), "/onboarding/reminder-time");
  draft.state = "completed";
  assert.equal(nextOnboardingRoute(draft), null);
  draft.state = "legacy";
  assert.equal(nextOnboardingRoute(draft), null);
});

test("draft version and completion are independent of saved answers", () => {
  assert.equal(parseDraft({ version: 2, challenge: "consistency" }), null);
  const draft = parseDraft({ ...emptyDraft(), challenge: "consistency" });
  assert.equal(draft?.state, "in_progress");
  assert.equal(nextOnboardingRoute(draft!), "/onboarding/goals");
});

test("guest and account drafts use separate storage keys", async () => {
  const values = new Map<string, string>();
  const original = {
    getItem: AsyncStorage.getItem, setItem: AsyncStorage.setItem,
    removeItem: AsyncStorage.removeItem,
  };
  AsyncStorage.getItem = async (key) => values.get(key) ?? null;
  AsyncStorage.setItem = async (key, value) => { values.set(key, value); };
  AsyncStorage.removeItem = async (key) => { values.delete(key); };
  try {
    const guest = { ...emptyDraft(), challenge: "motivation" };
    const account = { ...emptyDraft(), challenge: "consistency", state: "completed" as const };
    await saveGuestDraft(guest);
    await saveAccountDraft("user-a", account);
    assert.equal((await readGuestDraft())?.challenge, "motivation");
    assert.equal((await readAccountDraft("user-a"))?.challenge, "consistency");
    assert.equal(await readAccountDraft("user-b"), null);
    await clearGuestDraft();
    assert.equal(await readGuestDraft(), null);
    assert.equal((await readAccountDraft("user-a"))?.state, "completed");
  } finally {
    AsyncStorage.getItem = original.getItem;
    AsyncStorage.setItem = original.setItem;
    AsyncStorage.removeItem = original.removeItem;
  }
});
