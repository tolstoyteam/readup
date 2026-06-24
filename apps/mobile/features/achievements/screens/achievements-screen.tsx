import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AchievementRow } from "@/features/achievements/components/achievement-row";
import { useAchievements } from "@/features/achievements/hooks/use-achievements";
import type {
  AchievementCategory,
  AchievementViewModel,
} from "@/features/achievements/types";
import { useReadupColors, statusBarStyleForScheme } from "@/shared/constants/readup-theme";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";

const CATEGORY_ORDER: { category: AchievementCategory; label: string }[] = [
  { category: "streak", label: "Серии" },
  { category: "books", label: "Книги" },
  { category: "reading_time", label: "Время чтения" },
  { category: "daily", label: "За день" },
  { category: "activity", label: "Активность" },
];

type AchievementSection = {
  category: AchievementCategory;
  label: string;
  items: AchievementViewModel[];
  unlockedCount: number;
};

function groupByCategory(
  viewModels: AchievementViewModel[],
): AchievementSection[] {
  return CATEGORY_ORDER.map(({ category, label }) => {
    const items = viewModels.filter((row) => row.category === category);
    return {
      category,
      label,
      items,
      unlockedCount: items.filter((row) => row.isUnlocked).length,
    };
  }).filter((section) => section.items.length > 0);
}

export default function AchievementsScreen() {
  const colors = useReadupColors();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { viewModels, unlockedCount, totalCount, loading, reload } =
    useAchievements();

  const sections = useMemo(() => groupByCategory(viewModels), [viewModels]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return (
    <SafeAreaView
      className="flex-1 bg-[#FBFAF2] dark:bg-[#101512]"
      edges={["top"]}
    >
      <StatusBar style={statusBarStyleForScheme(colorScheme)} />

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
        <Text className="text-[18px] font-semibold tracking-[-0.72px] text-[#1A2420] dark:text-[#F3F4EE]">
          Все достижения
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
          contentContainerClassName="px-6 pb-10"
          showsVerticalScrollIndicator={false}
        >
          <Text className="mt-1 text-[13px] tracking-[-0.52px] text-[#7A7868] dark:text-[#8F9A93]">
            {unlockedCount} из {totalCount} получено
          </Text>
          <View className="mt-5 gap-7">
            {sections.map((section) => (
              <View key={section.category} className="gap-3">
                <View className="flex-row items-baseline justify-between">
                  <Text className="text-[15px] font-semibold tracking-[-0.6px] text-[#1A2420] dark:text-[#F3F4EE]">
                    {section.label}
                  </Text>
                  <Text className="text-[12px] tracking-[-0.48px] text-[#7A7868] dark:text-[#8F9A93]">
                    {section.unlockedCount} из {section.items.length}
                  </Text>
                </View>
                {section.items.map((achievement) => (
                  <AchievementRow
                    key={achievement.slug}
                    achievement={achievement}
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
