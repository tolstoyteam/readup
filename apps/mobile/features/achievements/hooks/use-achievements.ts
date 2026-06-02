import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchAchievementCatalog,
  fetchHasPerfectQuiz,
  fetchUnlockedAchievements,
} from "@/features/achievements/api/achievements";
import { buildAchievementViewModels } from "@/features/achievements/build-view-models";
import type { AchievementViewModel } from "@/features/achievements/types";
import { fetchProfile } from "@/features/profile/api/profile";
import { useLibrary } from "@/features/library";
import { useAuth } from "@/shared/context/auth-context";

export function useAchievements() {
  const { user } = useAuth();
  const { completedBooks } = useLibrary();
  const [viewModels, setViewModels] = useState<AchievementViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const completedBooksCount = completedBooks.length;

  const reload = useCallback(async () => {
    if (!user) {
      setViewModels([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [catalog, unlocks, profile, hasPerfectQuiz] = await Promise.all([
        fetchAchievementCatalog(),
        fetchUnlockedAchievements(user.id),
        fetchProfile(user.id),
        fetchHasPerfectQuiz(user.id),
      ]);

      const stats = {
        completedBooksCount,
        currentStreakDays: profile?.current_streak_days ?? 0,
        totalReadingMinutes: profile?.total_reading_minutes ?? 0,
        hasPerfectQuiz,
      };

      setViewModels(buildAchievementViewModels(catalog, unlocks, stats));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load achievements");
      setViewModels([]);
    } finally {
      setLoading(false);
    }
  }, [user, completedBooksCount]);

  useEffect(() => {
    void reload();
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
