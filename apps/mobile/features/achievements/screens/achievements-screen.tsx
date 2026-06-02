import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "lucide-react-native";
import { useCallback } from "react";
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
import { ReadupColors } from "@/shared/constants/readup-theme";

export default function AchievementsScreen() {
  const router = useRouter();
  const { viewModels, unlockedCount, totalCount, loading, reload } =
    useAchievements();

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

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
          Все достижения
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
          <Text className="mt-1 text-[13px] tracking-[-0.52px] text-[#7A7868]">
            {unlockedCount} из {totalCount} получено
          </Text>
          <View className="mt-5 gap-3">
            {viewModels.map((achievement) => (
              <AchievementRow key={achievement.slug} achievement={achievement} />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
