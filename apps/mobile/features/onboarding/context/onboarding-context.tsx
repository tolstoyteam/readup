import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";

import { useAuth } from "@/shared/context/auth-context";
import { attachGuestDraft, fetchAccountOnboarding, updateAccountOnboarding } from "../api/onboarding";
import {
  clearGuestDraft, clearPendingDraft, emptyDraft, nextOnboardingRoute,
  readAccountDraft, readGuestDraft, readPendingDraft, saveAccountDraft, saveGuestDraft,
  savePendingDraft, type OnboardingDraft,
} from "../lib/onboarding-draft";

type OnboardingContextValue = {
  draft: OnboardingDraft | null;
  ready: boolean;
  hasAccountRecord: boolean;
  hasLocalDraft: boolean;
  launchRoute: string | null;
  updateAnswer: <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => void;
  complete: (time: string) => Promise<void>;
  dismiss: () => void;
};

const Context = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [ready, setReady] = useState(false);
  const [hasAccountRecord, setHasAccountRecord] = useState(false);
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [accountVerified, setAccountVerified] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const current = useRef<OnboardingDraft>(emptyDraft());
  const revision = useRef(0);
  const generation = useRef(0);
  const queue = useRef(Promise.resolve());

  const reconcile = useCallback(async (id: string | null, token: number) => {
    try {
      if (!id) {
        const guest = await readGuestDraft();
        if (token !== generation.current) return;
        current.current = guest ?? emptyDraft();
        setDraft(current.current);
        setHasAccountRecord(false);
        setHasLocalDraft(guest != null);
        setAccountVerified(true);
        return;
      }

      // Read the server first. A failed read must never turn into an insert.
      let record = await fetchAccountOnboarding(id);
      if (token !== generation.current) return;
      setAccountVerified(true);
      if (!record) {
        const guest = await readGuestDraft();
        record = await attachGuestDraft(id, guest ?? emptyDraft());
        if (token !== generation.current) return;
        await clearGuestDraft();
      } else {
        await clearGuestDraft();
      }

      const pending = await readPendingDraft(id);
      if (pending && pending.revision === record.revision && record.draft.state === "in_progress") {
        try {
          const synced = await updateAccountOnboarding(id, pending.draft, record.revision);
          record = synced ?? (await fetchAccountOnboarding(id)) ?? record;
          if (synced) await clearPendingDraft(id);
        } catch {
          // Keep a same-account pending edit for the next foreground/launch.
          if (token !== generation.current) return;
          current.current = pending.draft;
          setDraft(pending.draft);
          revision.current = record.revision;
          setHasAccountRecord(true);
          return;
        }
      } else if (pending) {
        await clearPendingDraft(id);
      }
      if (token !== generation.current) return;
      revision.current = record.revision;
      current.current = record.draft;
      setDraft(record.draft);
      setHasAccountRecord(true);
      setHasLocalDraft(false);
      await saveAccountDraft(id, record.draft);
    } catch {
      if (token !== generation.current) return;
      // The account is authoritative. A failed read cannot use local guest data.
      if (id) {
        const cached = await readAccountDraft(id).catch(() => null);
        if (token !== generation.current) return;
        current.current = cached ?? emptyDraft();
        setDraft(cached);
        setHasAccountRecord(true); // Suppress onboarding until the account is verified.
        setAccountVerified(false);
      } else {
        current.current = emptyDraft();
        setDraft(current.current);
      }
    } finally {
      if (token === generation.current) setReady(true);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    const token = ++generation.current;
    setReady(false);
    setDraft(null);
    setDismissed(false);
    setHasAccountRecord(false);
    setHasLocalDraft(false);
    setAccountVerified(false);
    queue.current = Promise.resolve();
    void reconcile(userId, token);
    return () => { generation.current++; };
  }, [userId, loading, reconcile]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && userId && ready) {
        void queue.current.catch(() => undefined).then(() => reconcile(userId, generation.current));
      }
    });
    return () => subscription.remove();
  }, [userId, ready, reconcile]);

  const persist = useCallback((next: OnboardingDraft) => {
    current.current = next;
    setDraft(next);
    if (!userId) setHasLocalDraft(true);
    const id = userId;
    const token = generation.current;
    queue.current = queue.current.catch(() => undefined).then(async () => {
      if (token !== generation.current) return;
      if (!id) {
        await saveGuestDraft(next);
        return;
      }
      const base = revision.current;
      await savePendingDraft(id, base, next);
      const synced = await updateAccountOnboarding(id, next, base);
      if (token !== generation.current) return;
      if (!synced) {
        const account = await fetchAccountOnboarding(id);
        if (account) {
          revision.current = account.revision;
          current.current = account.draft;
          setDraft(account.draft);
          await saveAccountDraft(id, account.draft);
          await clearPendingDraft(id);
        }
        return;
      }
      revision.current = synced.revision;
      await saveAccountDraft(id, synced.draft);
      await clearPendingDraft(id);
    });
  }, [userId]);

  const updateAnswer = useCallback(<K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => {
    persist({ ...current.current, [key]: value, state: "in_progress" });
  }, [persist]);

  const complete = useCallback(async (time: string) => {
    persist({ ...current.current, reminderTime: time, state: "completed" });
    await queue.current.catch(() => undefined);
  }, [persist]);

  const launchRoute = ready && accountVerified && !dismissed && draft?.state === "in_progress"
    ? nextOnboardingRoute(draft) : null;

  return <Context.Provider value={{ draft, ready, hasAccountRecord, hasLocalDraft, launchRoute, updateAnswer, complete, dismiss: () => setDismissed(true) }}>
    {children}
  </Context.Provider>;
}

export function useOnboarding() {
  const context = useContext(Context);
  if (!context) throw new Error("useOnboarding must be used within OnboardingProvider");
  return context;
}
