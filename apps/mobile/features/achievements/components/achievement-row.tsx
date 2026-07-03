import { Text, View } from "react-native";

import { AchievementIcon } from "@/features/achievements/components/achievement-icon";
import type { AchievementViewModel } from "@/features/achievements/types";
import { useReadupColors } from "@/shared/constants/readup-theme";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import type { InterfaceLanguage } from "@/shared/i18n/interface-language";

type AchievementRowProps = {
  achievement: AchievementViewModel;
};

function formatUnlockDate(iso: string, language: InterfaceLanguage): string {
  try {
    return new Date(iso).toLocaleDateString(
      language === "en" ? "en-US" : "ru-RU",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      },
    );
  } catch {
    return iso;
  }
}

export function AchievementRow({ achievement }: AchievementRowProps) {
  const colors = useReadupColors();
  const { language, t } = useInterfaceLanguage();
  const { isUnlocked, progress } = achievement;
  const barWidth = isUnlocked
    ? 100
    : progress.target > 0
      ? Math.min((progress.current / progress.target) * 100, 100)
      : 0;

  return (
    <View className="rounded-[20px] bg-[#F2F0E6] dark:bg-[#19211D] px-5 py-5">
      <View className="flex-row items-start gap-3">
        <View
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{
            backgroundColor: isUnlocked ? "#ECFDF5" : colors.elevated,
          }}
        >
          <AchievementIcon
            name={achievement.icon}
            color={isUnlocked ? colors.brand : colors.textTertiary}
          />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text className="flex-1 text-[16px] font-medium tracking-[-0.64px] text-[#1A2420] dark:text-[#F3F4EE]">
              {achievement.title}
            </Text>
            {isUnlocked ? (
              <View className="rounded-full border border-[#059669] dark:border-[#34D399] bg-[#ECFDF5] dark:bg-[#123D2C] px-2.5 py-0.5">
                <Text className="text-[11px] font-medium tracking-[-0.44px] text-[#059669] dark:text-[#34D399]">
                  {t("achievements.unlocked")}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-1 text-[13px] tracking-[-0.52px] text-[#4A5550] dark:text-[#B8C1BB]">
            {achievement.description}
          </Text>
          {isUnlocked && achievement.unlockedAt ? (
            <Text className="mt-2 text-[12px] tracking-[-0.48px] text-[#7A7868] dark:text-[#8F9A93]">
              {formatUnlockDate(achievement.unlockedAt, language)}
            </Text>
          ) : null}
          {!isUnlocked ? (
            <View className="mt-3">
              <Text className="text-[12px] tracking-[-0.48px] text-[#7A7868] dark:text-[#8F9A93]">
                {t("achievements.progress", {
                  current: progress.current,
                  target: progress.target,
                })}
              </Text>
              <View className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E8E6D8] dark:bg-[#26302B]">
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
