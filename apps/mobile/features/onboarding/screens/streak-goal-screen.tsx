import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Flame, Trophy } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useReadupColors } from "@/shared/constants/readup-theme";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import type { TranslationKey } from "@/shared/i18n/translations";

const STREAK_OPTIONS = [
  { days: 7, labelKey: "onboarding.streakPromising" },
  { days: 14, labelKey: "onboarding.streakDetermined" },
  { days: 30, labelKey: "onboarding.streakImpressive" },
  { days: 50, labelKey: "onboarding.streakUnstoppable" },
] as const satisfies readonly { days: number; labelKey: TranslationKey }[];

export default function StreakGoalScreen() {
  const colors = useReadupColors();
  const colorScheme = useColorScheme();
  const { t } = useInterfaceLanguage();
  const router = useRouter();
  const [selectedDays, setSelectedDays] = useState(14);
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_700Bold });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand} size="large" /></View>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24 }}>
        <View accessibilityRole="progressbar" accessibilityLabel={t("onboarding.streakProgress")} accessibilityValue={{ min: 0, max: 7, now: 5 }} style={{ height: 8, borderRadius: 999, backgroundColor: colors.elevated, overflow: "hidden" }}>
          <View style={{ width: "71.4286%", height: "100%", borderRadius: 999, backgroundColor: colors.brand }} />
        </View>
        <Text accessibilityRole="header" style={{ marginTop: 48, marginBottom: 30, color: colors.text, fontFamily: "Inter_700Bold", fontSize: 28, lineHeight: 34, textAlign: "center" }}>
          {t("onboarding.streakTitle")}
        </Text>
        <View style={{ gap: 10 }}>
          {STREAK_OPTIONS.map(({ days, labelKey }) => {
            const selected = selectedDays === days;
            return (
              <Pressable key={days} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setSelectedDays(days)}>
                <View style={{ minHeight: 88, borderRadius: 16, borderWidth: 1.5, borderColor: selected ? colors.brand : colors.border, backgroundColor: selected ? colors.surface : colors.elevated, paddingHorizontal: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <Text style={{ color: colors.text, fontFamily: "Inter_500Medium", fontSize: 18, lineHeight: 24 }}>{t("onboarding.streakDays", { count: days })}</Text>
                  <Text style={{ color: selected ? colors.brand : colors.textTertiary, fontFamily: "Inter_400Regular", fontSize: 16, lineHeight: 22 }}>{t(labelKey)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexGrow: 1, minHeight: 220, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18, paddingVertical: 24 }}>
          <View style={{ flex: 1, maxWidth: 190, borderRadius: 16, borderWidth: 1, borderColor: colors.brand, backgroundColor: colors.surface, padding: 16 }}>
            <Text style={{ color: colors.brand, fontFamily: "Inter_500Medium", fontSize: 16, lineHeight: 24 }}>{t("onboarding.streakEncouragement")}</Text>
          </View>
          <View style={{ width: 128, height: 128, borderRadius: 64, backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center" }}>
            <Flame size={76} color={colors.brand} fill={colors.brand} strokeWidth={1.5} />
            <View style={{ position: "absolute", bottom: 4, right: 4, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
              <Trophy size={27} color={colors.brandDark} strokeWidth={2.3} />
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <Pressable accessibilityRole="button" onPress={() => router.push("/onboarding/reading-time")}>
          <View style={{ minHeight: 64, borderRadius: 14, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.textInverse, fontFamily: "Inter_500Medium", fontSize: 18, lineHeight: 24 }}>{t("common.continue")}</Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
