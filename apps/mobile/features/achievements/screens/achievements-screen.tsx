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
import {
  useReadupColors,
  statusBarStyleForScheme,
} from "@/shared/constants/readup-theme";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import type { TranslationKey } from "@/shared/i18n/translations";

const CATEGORY_ORDER: {
  category: AchievementCategory;
  labelKey: TranslationKey;
}[] = [
  { category: "streak", labelKey: "achievements.categoryStreak" },
  { category: "books", labelKey: "achievements.categoryBooks" },
  { category: "reading_time", labelKey: "achievements.categoryReadingTime" },
  { category: "daily", labelKey: "achievements.categoryDaily" },
  { category: "activity", labelKey: "achievements.categoryActivity" },
];

type AchievementSection = {
  category: AchievementCategory;
  labelKey: TranslationKey;
  items: AchievementViewModel[];
  unlockedCount: number;
};

function groupByCategory(
  viewModels: AchievementViewModel[],
): AchievementSection[] {
  return CATEGORY_ORDER.map(({ category, labelKey }) => {
    const items = viewModels.filter((row) => row.category === category);
    return {
      category,
      labelKey,
      items,
      unlockedCount: items.filter((row) => row.isUnlocked).length,
    };
  }).filter((section) => section.items.length > 0);
}

export default function AchievementsScreen() {
  const colors = useReadupColors();
  const { t } = useInterfaceLanguage();
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
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      edges={["top"]}
    >
      <StatusBar style={statusBarStyleForScheme(colorScheme)} />

      <View className="flex-row items-center justify-between px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full active:opacity-80"
          style={{ backgroundColor: colors.surface }}
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text
          className="text-[18px] font-semibold tracking-[-0.72px]"
          style={{ color: colors.text }}
        >
          {t("achievements.allTitle")}
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
          <Text
            className="mt-1 text-[13px] tracking-[-0.52px]"
            style={{ color: colors.textTertiary }}
          >
            {t("profile.unlockedCount", {
              unlocked: unlockedCount,
              total: totalCount,
            })}
          </Text>
          <View className="mt-5 gap-7">
            {sections.map((section) => (
              <View key={section.category} className="gap-3">
                <View className="flex-row items-baseline justify-between">
                  <Text
                    className="text-[15px] font-semibold tracking-[-0.6px]"
                    style={{ color: colors.text }}
                  >
                    {t(section.labelKey)}
                  </Text>
                  <Text
                    className="text-[12px] tracking-[-0.48px]"
                    style={{ color: colors.textTertiary }}
                  >
                    {t("achievements.sectionCount", {
                      unlocked: section.unlockedCount,
                      total: section.items.length,
                    })}
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
