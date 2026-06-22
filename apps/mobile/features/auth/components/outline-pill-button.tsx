import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useReadupColors } from "@/shared/constants/readup-theme";

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
  const colors = useReadupColors();
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
          borderColor: colors.brand,
          opacity: isDisabled ? 0.62 : 1,
          width: "100%",
        },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text
          style={{
            fontSize: 18,
            fontWeight: "500",
            color: colors.text,
            letterSpacing: -0.72,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
