import { StyleSheet, Text, View } from "react-native";

import { useReadupColors } from "@/shared/constants/readup-theme";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";

export function AuthDivider() {
  const colors = useReadupColors();
  const { t } = useInterfaceLanguage();

  return (
    <View style={styles.row}>
      <View style={[styles.line, { backgroundColor: colors.elevated }]} />
      <Text style={[styles.label, { color: colors.textTertiary }]}>
        {t("auth.orContinueWith")}
      </Text>
      <View style={[styles.line, { backgroundColor: colors.elevated }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  line: { flex: 1, height: 1 },
  label: { fontSize: 12, fontWeight: "500" },
});
