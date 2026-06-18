import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchProfile,
  fetchReadingDailyLog,
  type Profile,
  type ReadingDailyLogEntry,
} from "@/features/profile/api/profile";
import { subscribeEngagementRefresh } from "@/features/engagement/engagement-refresh";
import { useAuth } from "@/shared/context/auth-context";

import { todayActivityDateKey } from "./activity-date";
import {
  buildReadingStatsSnapshot,
  type ReadingStatsSnapshot,
} from "./reading-stats";

export type UseReadingStatsResult = {
  profile: Profile | null;
  log: ReadingDailyLogEntry[];
  todayKey: string;
  stats: ReadingStatsSnapshot;
  loading: boolean;
  reload: () => Promise<void>;
};

export function useReadingStats(logDays = 14): UseReadingStatsResult {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [log, setLog] = useState<ReadingDailyLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const todayKey = useMemo(() => todayActivityDateKey(), []);

  const reload = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLog([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [prof, dailyLog] = await Promise.all([
        fetchProfile(user.id),
        fetchReadingDailyLog(user.id, logDays),
      ]);
      setProfile(prof);
      setLog(dailyLog);
    } finally {
      setLoading(false);
    }
  }, [user, logDays]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    return subscribeEngagementRefresh(() => {
      void reload();
    });
  }, [reload]);

  const stats = useMemo(
    () => buildReadingStatsSnapshot(profile, todayKey, log.length),
    [profile, todayKey, log.length],
  );

  return {
    profile,
    log,
    todayKey,
    stats,
    loading,
    reload,
  };
}
