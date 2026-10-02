import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from "@expo-google-fonts/inter";
import { Host, Picker } from "@expo/ui";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useReadupColors } from "@/shared/constants/readup-theme";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";

const MONTHLY_GOALS = Array.from({ length: 50 }, (_, index) => index + 1);

export default function MonthlyGoalScreen() {
  const colors = useReadupColors();
  const colorScheme = useColorScheme();
  const { t } = useInterfaceLanguage();
  const router = useRouter();
  const [monthlyGoal, setMonthlyGoal] = useState(4);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

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
          paddingTop: 20,
          paddingBottom: 24,
        }}
      >
        <View>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={t("onboarding.monthlyGoalProgress")}
            accessibilityValue={{ min: 0, max: 8, now: 4 }}
            style={{
              height: 8,
              borderRadius: 999,
              backgroundColor: colors.elevated,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: "50%",
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
            {t("onboarding.monthlyGoalTitle")}
          </Text>
          <Text
            style={{
              marginTop: 12,
              color: colors.textSecondary,
              fontFamily: "Inter_400Regular",
              fontSize: 16,
              lineHeight: 24,
              textAlign: "center",
            }}
          >
            {t("onboarding.monthlyGoalSubtitle")}
          </Text>
        </View>

        <View
          style={{
            flexGrow: 1,
            minHeight: 320,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Host style={{ width: "100%", height: 260 }}>
            <Picker<number>
              appearance="wheel"
              selectedValue={monthlyGoal}
              onValueChange={setMonthlyGoal}
            >
              {MONTHLY_GOALS.map((value) => (
                <Picker.Item key={value} label={String(value)} value={value} />
              ))}
            </Picker>
          </Host>
          <Text
            style={{
              marginTop: 12,
              color: colors.textSecondary,
              fontFamily: "Inter_500Medium",
              fontSize: 16,
              lineHeight: 24,
              textAlign: "center",
            }}
          >
            {monthlyGoal} {t("onboarding.monthlyGoalUnit")}
          </Text>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/onboarding/streak-goal")}
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
      </View>
    </SafeAreaView>
  );
}
