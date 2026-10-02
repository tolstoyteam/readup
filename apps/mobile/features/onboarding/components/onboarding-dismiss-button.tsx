import { useRouter } from "expo-router";
import { Pressable, Text } from "react-native";
import { useReadupColors } from "@/shared/constants/readup-theme";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import { useOnboarding } from "../context/onboarding-context";

export function OnboardingDismissButton() {
  const router = useRouter();
  const colors = useReadupColors();
  const { t } = useInterfaceLanguage();
  const { dismiss } = useOnboarding();
  return <Pressable accessibilityRole="button" onPress={() => { dismiss(); router.replace("/"); }}
    style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{t("common.skip")}</Text>
  </Pressable>;
}
