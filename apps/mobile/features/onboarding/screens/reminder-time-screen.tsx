import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from "@expo-google-fonts/inter";
import { Host, Picker } from "@expo/ui";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Flame } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useReadupColors } from "@/shared/constants/readup-theme";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import { useOnboarding } from "../context/onboarding-context";
import { OnboardingDismissButton } from "../components/onboarding-dismiss-button";

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

export default function ReminderTimeScreen() {
  const colors = useReadupColors();
  const colorScheme = useColorScheme();
  const { t } = useInterfaceLanguage();
  const router = useRouter();
  const { draft, updateAnswer, complete } = useOnboarding();
  const [hour, minute] = (draft?.reminderTime ?? "21:00").split(":").map(Number);
  const [saving, setSaving] = useState(false);
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_700Bold });

  async function continueOnboarding() {
    if (saving) return;
    setSaving(true);
    try {
      const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      await complete(time);
      router.replace("/");
    } finally {
      setSaving(false);
    }
  }

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand} size="large" /></View>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24 }}>
        <View accessibilityRole="progressbar" accessibilityLabel={t("onboarding.reminderProgress")} accessibilityValue={{ min: 0, max: 7, now: 7 }} style={{ height: 8, borderRadius: 999, backgroundColor: colors.elevated, overflow: "hidden" }}>
          <View style={{ width: "100%", height: "100%", borderRadius: 999, backgroundColor: colors.brand }} />
        </View>
        <View style={{ alignItems: "center", marginTop: 54 }}>
          <View style={{ width: 116, height: 150, alignItems: "center", justifyContent: "center" }}>
            <Flame size={130} color={colors.brand} fill={colors.brand} strokeWidth={1.5} />
            <View style={{ position: "absolute", bottom: 14, width: 78, height: 68, borderRadius: 8, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.brandDark, fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 2 }}>{t("onboarding.reminderDay")}</Text>
              <Text style={{ color: colors.text, fontFamily: "Inter_700Bold", fontSize: 38, lineHeight: 44 }}>21</Text>
            </View>
          </View>
          <Text accessibilityRole="header" style={{ marginTop: 24, color: colors.text, fontFamily: "Inter_700Bold", fontSize: 30, lineHeight: 36, textAlign: "center" }}>
            {t("onboarding.reminderTitle")}
          </Text>
          <Text style={{ marginTop: 12, color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 16, lineHeight: 23, textAlign: "center" }}>
            {t("onboarding.reminderSubtitle")}
          </Text>
        </View>
        <View style={{ flexGrow: 1, minHeight: 290, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Host style={{ width: 100, height: 250 }}>
            <Picker<number> appearance="wheel" selectedValue={hour} onValueChange={(value) => updateAnswer("reminderTime", `${String(value).padStart(2, "0")}:${String(minute).padStart(2, "0")}`)}>
              {HOURS.map((value) => <Picker.Item key={value} label={String(value).padStart(2, "0")} value={value} />)}
            </Picker>
          </Host>
          <Text style={{ color: colors.text, fontFamily: "Inter_500Medium", fontSize: 24 }}>:</Text>
          <Host style={{ width: 100, height: 250 }}>
            <Picker<number> appearance="wheel" selectedValue={minute} onValueChange={(value) => updateAnswer("reminderTime", `${String(hour).padStart(2, "0")}:${String(value).padStart(2, "0")}`)}>
              {MINUTES.map((value) => <Picker.Item key={value} label={String(value).padStart(2, "0")} value={value} />)}
            </Picker>
          </Host>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => void continueOnboarding()}>
          <View style={{ minHeight: 64, borderRadius: 14, backgroundColor: colors.brand, opacity: saving ? 0.5 : 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.textInverse, fontFamily: "Inter_500Medium", fontSize: 18, lineHeight: 24 }}>{t("common.continue")}</Text>
          </View>
        </Pressable>
        <OnboardingDismissButton />
      </View>
    </SafeAreaView>
  );
}
