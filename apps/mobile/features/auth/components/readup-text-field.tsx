import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { ReadupColors, ReadupRadii } from "@/shared/constants/readup-theme";

type ReadupTextFieldProps = {
  label: string;
  /** After `useFonts`, e.g. `Inter_500Medium`. */
  labelFontFamily?: string;
} & TextInputProps;

export function ReadupTextField({
  label,
  labelFontFamily,
  style,
  onFocus,
  onBlur,
  ...rest
}: ReadupTextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, labelFontFamily != null && { fontFamily: labelFontFamily }]}>
        {label}
      </Text>
      <TextInput
        {...rest}
        style={[styles.input, focused ? styles.inputFocused : styles.inputIdle, style]}
        placeholderTextColor={ReadupColors.textTertiary}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
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
    color: "#000000",
    letterSpacing: -0.56,
  },
  input: {
    backgroundColor: ReadupColors.surface,
    borderRadius: ReadupRadii.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: ReadupColors.text,
    letterSpacing: -0.56,
  },
  inputIdle: {
    borderWidth: 1,
    borderColor: ReadupColors.elevated,
  },
  inputFocused: {
    borderWidth: 2,
    borderColor: ReadupColors.info,
  },
});
