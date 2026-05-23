import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  BookOpen,
  Flame,
  Target,
  Trophy,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  fetchProfile,
  fetchReadingDailyLog,
  saveDailyReadingGoal,
  type Profile,
  type ReadingDailyLogEntry,
} from "@/features/profile/api/profile";
import { ReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";

const GOAL_OPTIONS = [5, 10, 20, 30];

export default function StreakScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [log, setLog] = useState<ReadingDailyLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingGoal, setSavingGoal] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [prof, dailyLog] = await Promise.all([
        fetchProfile(user.id),
        fetchReadingDailyLog(user.id, 14),
      ]);
      setProfile(prof);
      setLog(dailyLog);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function selectGoal(minutes: number) {
    if (!user || savingGoal) return;
    setSavingGoal(true);
    try {
      const next = await saveDailyReadingGoal(user.id, minutes);
      setProfile(next);
    } finally {
      setSavingGoal(false);
    }
  }

  const dailyGoal = profile?.daily_reading_goal_minutes ?? 5;
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayEntry = log.find((entry) => entry.date === todayKey);
  const todayMinutes = todayEntry?.minutes ?? 0;
  const dailyProgress = Math.min(todayMinutes / Math.max(dailyGoal, 1), 1);
  const maxLogMinutes = Math.max(...log.map((entry) => entry.minutes), dailyGoal, 1);

  return (
    <SafeAreaView className="flex-1 bg-[#FBFAF2]" edges={["top"]}>
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Назад"
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full bg-[#F2F0E6] active:opacity-80"
        >
          <ArrowLeft size={22} color={ReadupColors.text} strokeWidth={2} />
        </Pressable>
        <Text className="text-[18px] font-semibold tracking-[-0.72px] text-[#1A2420]">
          Прогресс
        </Text>
        <View className="h-10 w-10" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={ReadupColors.brand} />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-10"
          showsVerticalScrollIndicator={false}
        >
          <View className="mt-2 rounded-[20px] bg-[#F2F0E6] px-5 py-6">
            <View className="flex-row items-center gap-2">
              <Flame size={22} color={ReadupColors.brand} strokeWidth={2.2} />
              <Text className="text-[14px] tracking-[-0.56px] text-[#4A5550]">
                Текущая серия
              </Text>
            </View>
            <Text className="mt-2 text-[44px] font-extrabold tracking-[-1.76px] text-[#1A2420]">
              {profile?.current_streak_days ?? 0}{" "}
              <Text className="text-[18px] font-medium tracking-[-0.72px] text-[#4A5550]">
                {dayLabel(profile?.current_streak_days ?? 0)}
              </Text>
            </Text>
            <Text className="mt-1 text-[13px] tracking-[-0.52px] text-[#7A7868]">
              Лучшая серия: {profile?.longest_streak_days ?? 0}
            </Text>
          </View>

          <View className="mt-5 flex-row gap-3">
            <StatTile
              icon={<BookOpen size={20} color={ReadupColors.brand} strokeWidth={2.2} />}
              label="Книг прочитано"
              value={String(profile?.total_books_completed ?? 0)}
            />
            <StatTile
              icon={<Trophy size={20} color={ReadupColors.brand} strokeWidth={2.2} />}
              label="Минут чтения"
              value={String(profile?.total_reading_minutes ?? 0)}
            />
          </View>

          <View className="mt-7">
            <View className="flex-row items-center gap-2">
              <Target size={18} color={ReadupColors.brand} strokeWidth={2.2} />
              <Text className="text-[18px] font-medium tracking-[-0.72px] text-[#1A2420]">
                Цель на день
              </Text>
            </View>
            <Text className="mt-1 text-[13px] tracking-[-0.52px] text-[#7A7868]">
              Сегодня: {todayMinutes} / {dailyGoal} мин
            </Text>
            <View className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#E8E6D8]">
              <View
                className="h-full rounded-full bg-[#059669]"
                style={{ width: `${dailyProgress * 100}%` }}
              />
            </View>
            <View className="mt-4 flex-row flex-wrap gap-2">
              {GOAL_OPTIONS.map((option) => {
                const active = option === dailyGoal;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => selectGoal(option)}
                    disabled={savingGoal}
                    className="rounded-full border px-3 py-1.5"
                    style={{
                      borderColor: ReadupColors.brand,
                      backgroundColor: active ? ReadupColors.brand : "transparent",
                    }}
                  >
                    <Text
                      className="text-[13px] tracking-[-0.52px]"
                      style={{
                        color: active
                          ? ReadupColors.textInverse
                          : ReadupColors.brand,
                      }}
                    >
                      {option} мин
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="mt-8">
            <Text className="text-[18px] font-medium tracking-[-0.72px] text-[#1A2420]">
              Последние 14 дней
            </Text>
            <View className="mt-4 flex-row items-end gap-1.5">
              {generateLast14Days(todayKey).map((day) => {
                const entry = log.find((row) => row.date === day);
                const minutes = entry?.minutes ?? 0;
                const height = Math.max(
                  6,
                  (minutes / maxLogMinutes) * 110,
                );
                return (
                  <View key={day} className="flex-1 items-center gap-1.5">
                    <View
                      className="w-full rounded-[6px]"
                      style={{
                        height,
                        backgroundColor:
                          minutes > 0 ? ReadupColors.brand : ReadupColors.elevated,
                      }}
                    />
                    <Text className="text-[10px] tracking-[-0.4px] text-[#7A7868]">
                      {day.slice(8, 10)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function dayLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "дня";
  return "дней";
}

function generateLast14Days(todayKey: string): string[] {
  const days: string[] = [];
  const today = new Date(todayKey);
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 rounded-[16px] bg-[#F2F0E6] px-4 py-4">
      <View className="mb-2">{icon}</View>
      <Text className="text-[11px] uppercase tracking-[-0.44px] text-[#7A7868]">
        {label}
      </Text>
      <Text className="mt-1 text-[22px] font-semibold tracking-[-0.88px] text-[#1A2420]">
        {value}
      </Text>
    </View>
  );
}
