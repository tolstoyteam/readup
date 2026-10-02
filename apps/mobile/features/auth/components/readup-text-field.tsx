import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";

import { useReadupColors } from "@/shared/constants/readup-theme";

type ReadupTextFieldProps = {
  label: string;
  /** After `useFonts`, e.g. `Inter_500Medium`. */
  labelFontFamily?: string;
  /** When true, shows a show/hide control for secure fields. */
  secureToggle?: boolean;
  /** Highlights the field with an error border. */
  error?: boolean;
} & TextInputProps;

const ERROR_BORDER = "#8F0620";

export function ReadupTextField({
  label,
  labelFontFamily,
  style,
  onFocus,
  onBlur,
  secureToggle = false,
  secureTextEntry,
  error = false,
  ...rest
}: ReadupTextFieldProps) {
  const colors = useReadupColors();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isSecure = Boolean(secureTextEntry) && !revealed;
  const borderColor = error
    ? ERROR_BORDER
    : focused
      ? colors.brand
      : colors.border;

  return (
    <View style={styles.wrap}>
      <Text
        style={[
          styles.label,
          { color: error ? ERROR_BORDER : colors.text },
          labelFontFamily != null && { fontFamily: labelFontFamily },
        ]}
      >
        {label}
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          {...rest}
          secureTextEntry={isSecure}
          style={[
            styles.input,
            secureToggle && styles.inputWithToggle,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor,
              borderWidth: focused || error ? 2 : 1,
            },
            style,
          ]}
          placeholderTextColor={colors.textTertiary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
            hitSlop={8}
            onPress={() => setRevealed((v) => !v)}
            style={styles.toggle}
          >
            {revealed ? (
              <EyeOff size={18} color={colors.textSecondary} />
            ) : (
              <Eye size={18} color={colors.textSecondary} />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  inputRow: {
    position: "relative",
    width: "100%",
    justifyContent: "center",
  },
  input: {
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputWithToggle: {
    paddingRight: 44,
  },
  toggle: {
    position: "absolute",
    right: 12,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 32,
  },
});
