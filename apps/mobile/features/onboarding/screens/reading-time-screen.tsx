import { Inter_500Medium, Inter_700Bold } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CarFront, Clock3, Coffee, Moon, Pizza, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useReadupColors } from "@/shared/constants/readup-theme";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import type { TranslationKey } from "@/shared/i18n/translations";

const TIMES = [
  { id: "coffee", labelKey: "onboarding.timeCoffee", icon: Coffee },
  { id: "commute", labelKey: "onboarding.timeCommute", icon: CarFront },
  { id: "lunch", labelKey: "onboarding.timeLunch", icon: Pizza },
  { id: "bedtime", labelKey: "onboarding.timeBedtime", icon: Moon },
  { id: "anytime", labelKey: "onboarding.timeAnytime", icon: Clock3 },
] as const satisfies readonly { id: string; labelKey: TranslationKey; icon: LucideIcon }[];

type ReadingTime = (typeof TIMES)[number]["id"];

export default function ReadingTimeScreen() {
  const colors = useReadupColors();
  const colorScheme = useColorScheme();
  const { t } = useInterfaceLanguage();
  const router = useRouter();
  const [selected, setSelected] = useState<ReadingTime | null>(null);
  const [fontsLoaded] = useFonts({ Inter_500Medium, Inter_700Bold });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand} size="large" /></View>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24 }}>
        <View accessibilityRole="progressbar" accessibilityLabel={t("onboarding.timeProgress")} accessibilityValue={{ min: 0, max: 8, now: 6 }} style={{ height: 8, borderRadius: 999, backgroundColor: colors.elevated, overflow: "hidden" }}>
          <View style={{ width: "75%", height: "100%", borderRadius: 999, backgroundColor: colors.brand }} />
        </View>
        <Text accessibilityRole="header" style={{ marginTop: 48, marginBottom: 36, color: colors.text, fontFamily: "Inter_700Bold", fontSize: 28, lineHeight: 34, textAlign: "center" }}>
          {t("onboarding.timeTitle")}
        </Text>
        <View style={{ gap: 12 }}>
          {TIMES.map(({ id, labelKey, icon: Icon }) => {
            const isSelected = selected === id;
            return (
              <Pressable key={id} accessibilityRole="radio" accessibilityState={{ checked: isSelected }} onPress={() => setSelected(id)}>
                <View style={{ minHeight: 92, borderRadius: 14, borderWidth: 1.5, borderColor: isSelected ? colors.brand : colors.border, backgroundColor: isSelected ? colors.surface : colors.elevated, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", gap: 20 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
                    <Icon size={26} color={colors.brand} strokeWidth={2.2} />
                  </View>
                  <Text style={{ flex: 1, color: colors.text, fontFamily: "Inter_500Medium", fontSize: 18, lineHeight: 24 }}>{t(labelKey)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: selected === null }} disabled={selected === null} onPress={() => router.push("/onboarding/reminder-time")}>
          <View style={{ minHeight: 64, borderRadius: 14, backgroundColor: colors.brand, opacity: selected === null ? 0.5 : 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.textInverse, fontFamily: "Inter_500Medium", fontSize: 18, lineHeight: 24 }}>{t("common.continue")}</Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
