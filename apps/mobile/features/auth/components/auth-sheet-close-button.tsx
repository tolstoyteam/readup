import { router } from "expo-router";
import { X } from "lucide-react-native";
import { Pressable } from "react-native";

import { useReadupColors } from "@/shared/constants/readup-theme";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";

export function AuthSheetCloseButton() {
  const colors = useReadupColors();
  const { t } = useInterfaceLanguage();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("common.close")}
      hitSlop={10}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.replace("/");
      }}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surface,
      }}
    >
      <X size={20} color={colors.textSecondary} strokeWidth={2.2} />
    </Pressable>
  );
}
