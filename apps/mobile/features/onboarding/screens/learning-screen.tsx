import { Inter_500Medium, Inter_700Bold } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  BookOpen,
  Check,
  Headphones,
  Sparkles,
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

const OPTIONS = [
  { id: "reading", labelKey: "onboarding.learningReading", icon: BookOpen },
  { id: "listening", labelKey: "onboarding.learningListening", icon: Headphones },
  { id: "interactive", labelKey: "onboarding.learningInteractive", icon: Sparkles },
] as const satisfies readonly {
  id: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
}[];

type LearningOption = (typeof OPTIONS)[number]["id"];

export default function LearningScreen() {
  const colors = useReadupColors();
  const colorScheme = useColorScheme();
  const { t } = useInterfaceLanguage();
  const router = useRouter();
  const [selected, setSelected] = useState<LearningOption[]>([]);
  const [pressedOption, setPressedOption] = useState<LearningOption | null>(null);
  const [fontsLoaded] = useFonts({ Inter_500Medium, Inter_700Bold });

  function toggleOption(id: LearningOption) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((option) => option !== id)
        : [...current, id],
    );
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
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 24,
          justifyContent: "space-between",
          gap: 40,
        }}
      >
        <View>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={t("onboarding.learningProgress")}
            accessibilityValue={{ min: 0, max: 8, now: 3 }}
            style={{
              height: 8,
              borderRadius: 999,
              backgroundColor: colors.elevated,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: "37.5%",
                height: "100%",
                borderRadius: 999,
                backgroundColor: colors.brand,
              }}
            />
          </View>
          <Text
            accessibilityRole="header"
            style={{
              marginTop: 48,
              color: colors.text,
              fontFamily: "Inter_700Bold",
              fontSize: 28,
              lineHeight: 34,
              textAlign: "center",
            }}
          >
            {t("onboarding.learningTitle")}
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {OPTIONS.map((option) => {
            const isSelected = selected.includes(option.id);
            const Icon = option.icon;

            return (
              <Pressable
                key={option.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                onPress={() => toggleOption(option.id)}
                onPressIn={() => setPressedOption(option.id)}
                onPressOut={() => setPressedOption(null)}
              >
                <View
                  style={{
                    minHeight: 100,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.brand : colors.border,
                    backgroundColor: colors.elevated,
                    paddingHorizontal: 18,
                    paddingVertical: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                    opacity: pressedOption === option.id ? 0.7 : 1,
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
                      fontSize: 18,
                      lineHeight: 24,
                    }}
                  >
                    {t(option.labelKey)}
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
          disabled={selected.length === 0}
          onPress={() => router.replace("/")}
        >
          <View
            style={{
              minHeight: 64,
              borderRadius: 14,
              backgroundColor: colors.brand,
              opacity: selected.length > 0 ? 1 : 0.5,
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
      </View>
    </SafeAreaView>
  );
}
