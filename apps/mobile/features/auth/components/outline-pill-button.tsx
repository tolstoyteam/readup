import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { ReadupColors } from "@/shared/constants/readup-theme";

type OutlinePillButtonProps = Omit<PressableProps, "style"> & {
  label: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function OutlinePillButton({
  label,
  loading = false,
  disabled,
  style,
  ...props
}: OutlinePillButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={[
        {
          minHeight: 54,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 100,
          borderWidth: 2,
          borderColor: ReadupColors.brand,
          opacity: isDisabled ? 0.62 : 1,
          width: "100%",
        },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={ReadupColors.text} />
      ) : (
        <Text
          style={{
            fontSize: 18,
            fontWeight: "500",
            color: ReadupColors.text,
            letterSpacing: -0.72,
          }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
