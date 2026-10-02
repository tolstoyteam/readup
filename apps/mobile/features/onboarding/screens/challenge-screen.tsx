import { Inter_500Medium, Inter_700Bold } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useReadupColors } from "@/shared/constants/readup-theme";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import type { TranslationKey } from "@/shared/i18n/translations";
import { useOnboarding } from "../context/onboarding-context";
import { OnboardingDismissButton } from "../components/onboarding-dismiss-button";

const CHOICES = [
  { id: "consistency", labelKey: "onboarding.consistency" },
  { id: "motivation", labelKey: "onboarding.motivation" },
  { id: "productivity", labelKey: "onboarding.productivity" },
] as const satisfies readonly {
  id: string;
  labelKey: TranslationKey;
}[];

type Choice = (typeof CHOICES)[number]["id"];

export default function ChallengeScreen() {
  const colors = useReadupColors();
  const colorScheme = useColorScheme();
  const { t } = useInterfaceLanguage();
  const router = useRouter();
  const { draft, updateAnswer } = useOnboarding();
  const [pressedChoice, setPressedChoice] = useState<Choice | null>(null);
  const [fontsLoaded] = useFonts({ Inter_500Medium, Inter_700Bold });

  if (!fontsLoaded) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      edges={["top", "bottom"]}
    >
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 24,
          justifyContent: "space-between",
          gap: 40,
        }}
      >
        <View style={{ gap: 48 }}>
          <View style={{ gap: 12 }}>
            <Text
              style={{
                alignSelf: "flex-end",
                color: colors.textSecondary,
                fontFamily: "Inter_500Medium",
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              1 / 7
            </Text>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel={t("onboarding.progress")}
              accessibilityValue={{ min: 0, max: 7, now: 1 }}
              style={{
                height: 8,
                borderRadius: 999,
                backgroundColor: colors.elevated,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: "14.2857%",
                  height: "100%",
                  borderRadius: 999,
                  backgroundColor: colors.brand,
                }}
              />
            </View>
          </View>

          <Text
            accessibilityRole="header"
            style={{
              color: colors.text,
              fontFamily: "Inter_700Bold",
              fontSize: 28,
              lineHeight: 34,
              letterSpacing: -0.6,
            }}
          >
            {t("onboarding.challengeQuestion")}
          </Text>
        </View>

        <View style={{ gap: 14 }}>
          {CHOICES.map((choice) => {
            return (
              <Pressable
                key={choice.id}
                accessibilityRole="button"
                accessibilityState={{ selected: draft?.challenge === choice.id }}
                onPress={() => {
                  updateAnswer("challenge", choice.id);
                  router.push({
                    pathname: "/onboarding/goals",
                  });
                }}
                onPressIn={() => setPressedChoice(choice.id)}
                onPressOut={() => setPressedChoice(null)}
              >
                <View
                  style={{
                    height: 132,
                    width: "100%",
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: draft?.challenge === choice.id ? colors.brand : colors.border,
                    backgroundColor: colors.elevated,
                    paddingHorizontal: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressedChoice === choice.id ? 0.7 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontFamily: "Inter_500Medium",
                      fontSize: 20,
                      lineHeight: 28,
                      textAlign: "center",
                      textAlignVertical: "center",
                      includeFontPadding: false,
                    }}
                  >
                    {t(choice.labelKey)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <OnboardingDismissButton />
      </ScrollView>
    </SafeAreaView>
  );
}
