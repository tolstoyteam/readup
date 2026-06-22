import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { ReadupRadii, useReadupColors } from "@/shared/constants/readup-theme";

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
  const colors = useReadupColors();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text
        style={[
          styles.label,
          { color: colors.text },
          labelFontFamily != null && { fontFamily: labelFontFamily },
        ]}
      >
        {label}
      </Text>
      <TextInput
        {...rest}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: focused ? colors.info : colors.elevated,
            borderWidth: focused ? 2 : 1,
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
    letterSpacing: -0.56,
  },
  input: {
    borderRadius: ReadupRadii.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    letterSpacing: -0.56,
  },
});
