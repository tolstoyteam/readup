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
  const accentBackground = isUnlocked ? colors.elevated : colors.background;
  const accentColor = isUnlocked ? colors.brand : colors.textTertiary;
  const barWidth = isUnlocked
    ? 100
    : progress.target > 0
      ? Math.min((progress.current / progress.target) * 100, 100)
      : 0;

  return (
    <View
      className="rounded-[20px] border px-5 py-5"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }}
    >
      <View className="flex-row items-start gap-3">
        <View
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{
            backgroundColor: accentBackground,
          }}
        >
          <AchievementIcon
            name={achievement.icon}
            color={accentColor}
          />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text
              className="flex-1 text-[16px] font-medium tracking-[-0.64px]"
              style={{ color: colors.text }}
            >
              {achievement.title}
            </Text>
            {isUnlocked ? (
              <View
                className="rounded-full border px-2.5 py-0.5"
                style={{
                  backgroundColor: colors.elevated,
                  borderColor: colors.brand,
                }}
              >
                <Text
                  className="text-[11px] font-medium tracking-[-0.44px]"
                  style={{ color: colors.brand }}
                >
                  {t("achievements.unlocked")}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            className="mt-1 text-[13px] tracking-[-0.52px]"
            style={{ color: colors.textSecondary }}
          >
            {achievement.description}
          </Text>
          {isUnlocked && achievement.unlockedAt ? (
            <Text
              className="mt-2 text-[12px] tracking-[-0.48px]"
              style={{ color: colors.textTertiary }}
            >
              {formatUnlockDate(achievement.unlockedAt, language)}
            </Text>
          ) : null}
          {!isUnlocked ? (
            <View className="mt-3">
              <Text
                className="text-[12px] tracking-[-0.48px]"
                style={{ color: colors.textTertiary }}
              >
                {t("achievements.progress", {
                  current: progress.current,
                  target: progress.target,
                })}
              </Text>
              <View
                className="mt-2 h-2 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: colors.elevated }}
              >
                <View
                  className="h-full rounded-full"
                  style={{ width: `${barWidth}%`, backgroundColor: colors.brand }}
                />
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
