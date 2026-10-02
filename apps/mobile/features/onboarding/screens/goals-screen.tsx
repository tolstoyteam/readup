import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Award,
  BookOpen,
  BriefcaseBusiness,
  Check,
  HandHeart,
  Scale,
  Timer,
  UsersRound,
  type LucideIcon,
} from "lucide-react-native";
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

const GOALS = [
  { id: "productivity", labelKey: "onboarding.goalProductivity", icon: Timer },
  { id: "career", labelKey: "onboarding.goalCareer", icon: BriefcaseBusiness },
  { id: "faith", labelKey: "onboarding.goalFaith", icon: HandHeart },
  { id: "parent", labelKey: "onboarding.goalParent", icon: UsersRound },
  { id: "confidence", labelKey: "onboarding.goalConfidence", icon: Award },
  { id: "balance", labelKey: "onboarding.goalBalance", icon: Scale },
  { id: "reading", labelKey: "onboarding.goalReading", icon: BookOpen },
] as const satisfies readonly {
  id: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
}[];

type GoalId = (typeof GOALS)[number]["id"];

export default function GoalsScreen() {
  const colors = useReadupColors();
  const colorScheme = useColorScheme();
  const { t } = useInterfaceLanguage();
  const router = useRouter();
  const { draft, updateAnswer } = useOnboarding();
  const selectedGoals = (draft?.goals ?? []) as GoalId[];
  const [pressedGoal, setPressedGoal] = useState<GoalId | null>(null);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  function toggleGoal(id: GoalId) {
    updateAnswer("goals", selectedGoals.includes(id)
      ? selectedGoals.filter((goal) => goal !== id)
      : selectedGoals.length < 3 ? [...selectedGoals, id] : selectedGoals);
  }

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
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 24,
        }}
      >
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={t("onboarding.goalsProgress")}
          accessibilityValue={{ min: 0, max: 7, now: 2 }}
          style={{
            height: 8,
            borderRadius: 999,
            backgroundColor: colors.elevated,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: "28.5714%",
              height: "100%",
              borderRadius: 999,
              backgroundColor: colors.brand,
            }}
          />
        </View>

        <View style={{ marginTop: 48, alignItems: "center", gap: 8 }}>
          <Text
            accessibilityRole="header"
            style={{
              color: colors.text,
              fontFamily: "Inter_700Bold",
              fontSize: 28,
              lineHeight: 34,
              textAlign: "center",
            }}
          >
            {t("onboarding.goalsTitle")}
          </Text>
          <Text
            style={{
              maxWidth: 340,
              color: colors.textSecondary,
              fontFamily: "Inter_400Regular",
              fontSize: 16,
              lineHeight: 24,
              textAlign: "center",
            }}
          >
            {t("onboarding.goalsSubtitle")}
          </Text>
        </View>

        <View style={{ marginTop: 40, gap: 12 }}>
          {GOALS.map((goal) => {
            const isSelected = selectedGoals.includes(goal.id);
            const isDisabled = selectedGoals.length === 3 && !isSelected;
            const Icon = goal.icon;

            return (
              <Pressable
                key={goal.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected, disabled: isDisabled }}
                disabled={isDisabled}
                onPress={() => toggleGoal(goal.id)}
                onPressIn={() => setPressedGoal(goal.id)}
                onPressOut={() => setPressedGoal(null)}
              >
                <View
                  style={{
                    minHeight: 94,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.brand : colors.border,
                    backgroundColor: colors.elevated,
                    paddingHorizontal: 18,
                    paddingVertical: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                    opacity: isDisabled ? 0.5 : pressedGoal === goal.id ? 0.7 : 1,
                  }}
                >
                  <View
                    pointerEvents="none"
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      backgroundColor: colors.surface,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={24} color={colors.brand} strokeWidth={2} />
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      color: colors.text,
                      fontFamily: "Inter_500Medium",
                      fontSize: 16,
                      lineHeight: 22,
                    }}
                  >
                    {t(goal.labelKey)}
                  </Text>
                  <View
                    pointerEvents="none"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      borderWidth: isSelected ? 0 : 2,
                      borderColor: colors.border,
                      backgroundColor: isSelected ? colors.brand : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isSelected ? (
                      <Check size={18} color={colors.textInverse} strokeWidth={3} />
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <Pressable
          accessibilityRole="button"
          disabled={selectedGoals.length === 0}
          onPress={() => router.push("/onboarding/learning")}
        >
          <View
            style={{
              minHeight: 64,
              borderRadius: 14,
              backgroundColor: colors.brand,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: colors.textInverse,
                fontFamily: "Inter_500Medium",
                fontSize: 18,
                lineHeight: 24,
              }}
            >
              {t("common.continue")}
            </Text>
          </View>
        </Pressable>
        <OnboardingDismissButton />
      </View>
    </SafeAreaView>
  );
}
