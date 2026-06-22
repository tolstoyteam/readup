import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Flame,
  Minus,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { saveDailyReadingGoal } from "@/features/profile/api/profile";
import { generateLastNDays, useReadingStats } from "@/features/reading-stats";
import { useReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";

const GOAL_OPTIONS = [5, 10, 20, 30];
const CHART_PLOT_HEIGHT = 120;
const WEEKDAY_LABELS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export default function StreakScreen() {
  const colors = useReadupColors();
  const router = useRouter();
  const { user } = useAuth();
  const { profile, log, todayKey, stats, loading, reload } =
    useReadingStats(14);
  const [savingGoal, setSavingGoal] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  async function selectGoal(minutes: number) {
    if (!user || savingGoal) return;
    setSavingGoal(true);
    try {
      await saveDailyReadingGoal(user.id, minutes);
      await reload();
    } finally {
      setSavingGoal(false);
    }
  }

  const dailyGoal = profile?.daily_reading_goal_minutes ?? 5;

  const logByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of log) map.set(entry.date, entry.minutes);
    return map;
  }, [log]);

  const chartDays = useMemo(() => generateLastNDays(todayKey, 14), [todayKey]);

  const todayMinutes = logByDate.get(todayKey) ?? 0;
  const dailyProgress = Math.min(todayMinutes / Math.max(dailyGoal, 1), 1);

  const { maxLogMinutes, avgMinutes, peakDate, activeDayCount } =
    useMemo(() => {
      let max = 0;
      let sum = 0;
      let active = 0;
      let peak: string | null = null;
      let peakValue = 0;
      for (const day of chartDays) {
        const minutes = logByDate.get(day) ?? 0;
        if (minutes > max) max = minutes;
        if (minutes > 0) {
          sum += minutes;
          active += 1;
          if (minutes > peakValue) {
            peakValue = minutes;
            peak = day;
          }
        }
      }
      return {
        maxLogMinutes: Math.max(max, dailyGoal, 1),
        avgMinutes: active > 0 ? Math.round(sum / active) : 0,
        peakDate: peak,
        activeDayCount: active,
      };
    }, [chartDays, logByDate, dailyGoal]);

  const last7 = useMemo(() => chartDays.slice(-7), [chartDays]);

  const trend: "up" | "down" | "flat" | null =
    avgMinutes > 0 && todayMinutes > 0
      ? todayMinutes > avgMinutes
        ? "up"
        : todayMinutes < avgMinutes
          ? "down"
          : "flat"
      : null;

  const hasAnyMinutes = activeDayCount > 0;
  const avgLineHeight = (avgMinutes / maxLogMinutes) * CHART_PLOT_HEIGHT;

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView
      className="flex-1 bg-[#FBFAF2] dark:bg-[#101512]"
      edges={["top"]}
    >
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Назад"
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full bg-[#F2F0E6] dark:bg-[#19211D] active:opacity-80"
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text
          className="text-[18px] tracking-[-0.72px] text-[#1A2420] dark:text-[#F3F4EE]"
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          Прогресс
        </Text>
        <View className="h-10 w-10" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-6 pb-12 pt-2"
          showsVerticalScrollIndicator={false}
        >
          {/* Streak hero */}
          <View className="overflow-hidden rounded-[24px] border border-[#059669] dark:border-[#34D399] bg-[#ECFDF5] dark:bg-[#123D2C] p-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-[#D1FAE5] dark:bg-[#164E3A]">
                  <Flame
                    size={20}
                    color={colors.brand}
                    strokeWidth={2.4}
                  />
                </View>
                <Text
                  className="text-[14px] tracking-[-0.56px] text-[#047857] dark:text-[#34D399]"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  Текущая серия
                </Text>
              </View>
              <View className="rounded-full bg-[#D1FAE5] dark:bg-[#164E3A] px-3 py-1.5">
                <Text
                  className="text-[12px] tracking-[-0.48px] text-[#047857] dark:text-[#34D399]"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  Рекорд: {stats.longestStreakDays}
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-row items-baseline gap-2">
              <Text
                className="text-[52px] leading-[56px] tracking-[-2px] text-[#1A2420] dark:text-[#F3F4EE]"
                style={{ fontFamily: "Inter_700Bold" }}
              >
                {stats.currentStreakDays}
              </Text>
              <Text
                className="text-[18px] tracking-[-0.72px] text-[#4A5550] dark:text-[#B8C1BB]"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                {dayLabel(stats.currentStreakDays)}
              </Text>
            </View>

            <View className="mt-4 flex-row items-center justify-between">
              {last7.map((day) => {
                const active = (logByDate.get(day) ?? 0) > 0;
                const isToday = day === todayKey;
                return (
                  <View key={day} className="items-center gap-1.5">
                    <View
                      className="h-7 w-7 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: active
                          ? colors.brand
                          : "#D1FAE5",
                        borderWidth: isToday ? 2 : 0,
                        borderColor: colors.brandDark,
                      }}
                    >
                      {active ? (
                        <Flame
                          size={13}
                          color={colors.white}
                          strokeWidth={2.4}
                        />
                      ) : null}
                    </View>
                    <Text
                      className="text-[10px] tracking-[-0.4px]"
                      style={{
                        fontFamily: "Inter_500Medium",
                        color: isToday ? colors.brand : "#7A7868",
                      }}
                    >
                      {weekdayLabel(day)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Daily reading minutes — promoted key metric */}
          <View className="rounded-[20px] border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] p-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Clock size={18} color={colors.brand} strokeWidth={2.2} />
                <Text
                  className="text-[14px] tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  Минут чтения за день
                </Text>
              </View>
              {trend ? (
                <View
                  className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
                  style={{
                    backgroundColor:
                      trend === "up"
                        ? "#ECFDF5"
                        : trend === "down"
                          ? "#FEF2F2"
                          : "#FBFAF2",
                  }}
                >
                  {trend === "up" ? (
                    <TrendingUp
                      size={13}
                      color={colors.brand}
                      strokeWidth={2.4}
                    />
                  ) : trend === "down" ? (
                    <TrendingDown size={13} color="#DC2626" strokeWidth={2.4} />
                  ) : (
                    <Minus
                      size={13}
                      color={colors.textTertiary}
                      strokeWidth={2.4}
                    />
                  )}
                  <Text
                    className="text-[11px] tracking-[-0.44px]"
                    style={{
                      fontFamily: "Inter_500Medium",
                      color:
                        trend === "up"
                          ? colors.brandDark
                          : trend === "down"
                            ? "#DC2626"
                            : colors.textTertiary,
                    }}
                  >
                    {trend === "up"
                      ? "Выше среднего"
                      : trend === "down"
                        ? "Ниже среднего"
                        : "На уровне среднего"}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="mt-3 flex-row items-baseline gap-2">
              <Text
                className="text-[40px] leading-[44px] tracking-[-1.6px] text-[#1A2420] dark:text-[#F3F4EE]"
                style={{ fontFamily: "Inter_700Bold" }}
              >
                {todayMinutes}
              </Text>
              <Text
                className="text-[15px] tracking-[-0.6px] text-[#7A7868] dark:text-[#8F9A93]"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                / {dailyGoal} мин сегодня
              </Text>
            </View>

            <View className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#E8E6D8] dark:bg-[#26302B]">
              <View
                className="h-full rounded-full bg-[#059669]"
                style={{ width: `${dailyProgress * 100}%` }}
              />
            </View>

            <Text
              className="mt-2 text-[12px] tracking-[-0.48px] text-[#7A7868] dark:text-[#8F9A93]"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              {hasAnyMinutes
                ? `Среднее за активные дни: ${avgMinutes} мин`
                : "Читайте каждый день, чтобы видеть прогресс"}
            </Text>

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
                    className="rounded-full border px-3.5 py-1.5 active:opacity-80"
                    style={{
                      borderColor: colors.brand,
                      backgroundColor: active
                        ? colors.brand
                        : "transparent",
                    }}
                  >
                    <Text
                      className="text-[13px] tracking-[-0.52px]"
                      style={{
                        fontFamily: "Inter_500Medium",
                        color: active
                          ? colors.textInverse
                          : colors.brand,
                      }}
                    >
                      {option} мин
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Secondary stats */}
          <View className="flex-row gap-3">
            <StatTile
              icon={
                <Calendar
                  size={18}
                  color={colors.brand}
                  strokeWidth={2.2}
                />
              }
              label="Дней чтения"
              value={String(stats.totalReadingDays)}
            />
            <StatTile
              icon={
                <BookOpen
                  size={18}
                  color={colors.brand}
                  strokeWidth={2.2}
                />
              }
              label="Книг прочитано"
              value={String(stats.totalBooksCompleted)}
            />
            <StatTile
              icon={
                <Trophy
                  size={18}
                  color={colors.brand}
                  strokeWidth={2.2}
                />
              }
              label="Всего минут"
              value={String(stats.totalReadingMinutes)}
            />
          </View>

          {/* Last 14 days chart */}
          <View className="rounded-[20px] border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] p-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Target
                  size={18}
                  color={colors.brand}
                  strokeWidth={2.2}
                />
                <Text
                  className="text-[16px] tracking-[-0.64px] text-[#1A2420] dark:text-[#F3F4EE]"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  Последние 14 дней
                </Text>
              </View>
              {hasAnyMinutes ? (
                <View className="flex-row items-center gap-1.5">
                  <View className="h-0 w-3.5 border-t border-dashed border-[#7A7868]" />
                  <Text
                    className="text-[11px] tracking-[-0.44px] text-[#7A7868] dark:text-[#8F9A93]"
                    style={{ fontFamily: "Inter_400Regular" }}
                  >
                    среднее
                  </Text>
                </View>
              ) : null}
            </View>

            {hasAnyMinutes ? (
              <>
                <View
                  className="relative mt-5 flex-row items-end gap-1"
                  style={{ height: CHART_PLOT_HEIGHT + 18 }}
                >
                  {avgMinutes > 0 ? (
                    <View
                      pointerEvents="none"
                      className="absolute left-0 right-0 border-t border-dashed border-[#7A7868]"
                      style={{ bottom: avgLineHeight }}
                    />
                  ) : null}
                  {chartDays.map((day) => {
                    const minutes = logByDate.get(day) ?? 0;
                    const isPeak = day === peakDate;
                    const isToday = day === todayKey;
                    const showValue = isPeak || (isToday && minutes > 0);
                    const barHeight =
                      minutes > 0
                        ? Math.max(
                            8,
                            (minutes / maxLogMinutes) * CHART_PLOT_HEIGHT,
                          )
                        : 4;
                    return (
                      <View
                        key={day}
                        className="flex-1 items-center justify-end gap-1"
                      >
                        {showValue ? (
                          <Text
                            className="text-[10px] tracking-[-0.4px]"
                            style={{
                              fontFamily: "Inter_600SemiBold",
                              color: isPeak
                                ? colors.brandDark
                                : colors.brand,
                            }}
                          >
                            {minutes}
                          </Text>
                        ) : null}
                        <View
                          className="w-full rounded-[6px]"
                          style={{
                            height: barHeight,
                            backgroundColor:
                              minutes > 0
                                ? isPeak
                                  ? colors.brandDark
                                  : colors.brand
                                : colors.elevated,
                            borderWidth: isToday ? 2 : 0,
                            borderColor: colors.text,
                          }}
                        />
                      </View>
                    );
                  })}
                </View>
                <View className="mt-1.5 flex-row gap-1">
                  {chartDays.map((day) => {
                    const isToday = day === todayKey;
                    return (
                      <View key={day} className="flex-1 items-center">
                        <Text
                          className="text-[9px] tracking-[-0.36px]"
                          style={{
                            fontFamily: isToday
                              ? "Inter_600SemiBold"
                              : "Inter_400Regular",
                            color: isToday
                              ? colors.brand
                              : colors.textTertiary,
                          }}
                        >
                          {weekdayLabel(day)}
                        </Text>
                        <Text
                          className="text-[9px] tracking-[-0.36px] text-[#7A7868] dark:text-[#8F9A93]"
                          style={{ fontFamily: "Inter_400Regular" }}
                        >
                          {day.slice(8, 10)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <View className="mt-4 items-center justify-center rounded-[16px] bg-[#FBFAF2] dark:bg-[#101512] px-5 py-8">
                <BookOpen
                  size={28}
                  color={colors.textTertiary}
                  strokeWidth={1.8}
                />
                <Text
                  className="mt-3 text-center text-[14px] tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  Начните читать сегодня
                </Text>
                <Text
                  className="mt-1 text-center text-[12px] tracking-[-0.48px] text-[#7A7868] dark:text-[#8F9A93]"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  Здесь появится статистика за последние 14 дней
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function weekdayLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return WEEKDAY_LABELS[date.getUTCDay()] ?? "";
}

function dayLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "дня";
  return "дней";
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
    <View className="flex-1 rounded-[16px] border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] px-3 py-4">
      <View className="mb-2 h-8 w-8 items-center justify-center rounded-full bg-[#ECFDF5] dark:bg-[#123D2C]">
        {icon}
      </View>
      <Text
        className="text-[10px] uppercase tracking-[-0.4px] text-[#7A7868] dark:text-[#8F9A93]"
        style={{ fontFamily: "Inter_500Medium" }}
      >
        {label}
      </Text>
      <Text
        className="mt-1 text-[22px] tracking-[-0.88px] text-[#1A2420] dark:text-[#F3F4EE]"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {value}
      </Text>
    </View>
  );
}
