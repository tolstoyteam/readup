import { Text, View } from "react-native";

import { AchievementIcon } from "@/features/achievements/components/achievement-icon";
import type { AchievementViewModel } from "@/features/achievements/types";
import { ReadupColors } from "@/shared/constants/readup-theme";

type AchievementRowProps = {
  achievement: AchievementViewModel;
};

function formatUnlockDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function AchievementRow({ achievement }: AchievementRowProps) {
  const { isUnlocked, progress } = achievement;
  const barWidth = isUnlocked
    ? 100
    : progress.target > 0
      ? Math.min((progress.current / progress.target) * 100, 100)
      : 0;

  return (
    <View className="rounded-[20px] bg-[#F2F0E6] px-5 py-5">
      <View className="flex-row items-start gap-3">
        <View
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{
            backgroundColor: isUnlocked ? "#ECFDF5" : ReadupColors.elevated,
          }}
        >
          <AchievementIcon
            name={achievement.icon}
            color={isUnlocked ? ReadupColors.brand : ReadupColors.textTertiary}
          />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text className="flex-1 text-[16px] font-medium tracking-[-0.64px] text-[#1A2420]">
              {achievement.title}
            </Text>
            {isUnlocked ? (
              <View className="rounded-full border border-[#059669] bg-[#ECFDF5] px-2.5 py-0.5">
                <Text className="text-[11px] font-medium tracking-[-0.44px] text-[#059669]">
                  Получено
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-1 text-[13px] tracking-[-0.52px] text-[#4A5550]">
            {achievement.description}
          </Text>
          {isUnlocked && achievement.unlockedAt ? (
            <Text className="mt-2 text-[12px] tracking-[-0.48px] text-[#7A7868]">
              {formatUnlockDate(achievement.unlockedAt)}
            </Text>
          ) : null}
          {!isUnlocked ? (
            <View className="mt-3">
              <Text className="text-[12px] tracking-[-0.48px] text-[#7A7868]">
                Прогресс: {progress.current} / {progress.target}
              </Text>
              <View className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E8E6D8]">
                <View
                  className="h-full rounded-full bg-[#059669]"
                  style={{ width: `${barWidth}%` }}
                />
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
