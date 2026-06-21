import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchAchievementCatalog,
  fetchBestReadingDayMinutes,
  fetchHasPerfectQuiz,
  fetchUnlockedAchievements,
} from "@/features/achievements/api/achievements";
import { buildAchievementViewModels } from "@/features/achievements/build-view-models";
import type { AchievementViewModel } from "@/features/achievements/types";
import { subscribeEngagementRefresh } from "@/features/engagement/engagement-refresh";
import { fetchProfile } from "@/features/profile/api/profile";
import {
  getEffectiveCurrentStreak,
  todayActivityDateKey,
} from "@/features/reading-stats";
import { useAuth } from "@/shared/context/auth-context";

export function useAchievements() {
  const { user } = useAuth();
  const [viewModels, setViewModels] = useState<AchievementViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) {
      setViewModels([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [catalog, unlocks, profile, hasPerfectQuiz, bestDayMinutes] =
        await Promise.all([
          fetchAchievementCatalog(),
          fetchUnlockedAchievements(user.id),
          fetchProfile(user.id),
          fetchHasPerfectQuiz(user.id),
          fetchBestReadingDayMinutes(user.id),
        ]);

      const todayKey = todayActivityDateKey();
      const stats = {
        completedBooksCount: profile?.total_books_completed ?? 0,
        currentStreakDays: getEffectiveCurrentStreak(profile, todayKey),
        totalReadingMinutes: profile?.total_reading_minutes ?? 0,
        hasPerfectQuiz,
        totalReadingDays: profile?.total_reading_days ?? 0,
        bestDayMinutes,
      };

      setViewModels(buildAchievementViewModels(catalog, unlocks, stats));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load achievements");
      setViewModels([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    return subscribeEngagementRefresh(() => {
      void reload();
    });
  }, [reload]);

  const unlockedCount = useMemo(
    () => viewModels.filter((row) => row.isUnlocked).length,
    [viewModels],
  );

  const totalCount = viewModels.length;

  return {
    viewModels,
    unlockedCount,
    totalCount,
    loading,
    error,
    reload,
  };
}
