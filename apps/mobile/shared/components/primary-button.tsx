import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useReadupColors } from "@/shared/constants/readup-theme";

type PrimaryButtonProps = Omit<PressableProps, "style"> & {
  label: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  loading = false,
  disabled,
  style,
  ...props
}: PrimaryButtonProps) {
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
          borderColor: colors.brandDark,
          backgroundColor: colors.brand,
          opacity: isDisabled ? 0.62 : 1,
        },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={colors.textInverse} />
      ) : (
        <Text className="text-center text-[18px] font-medium tracking-[-0.72px] text-[#FBFAF2]">
          {label}
        </Text>
      )}
    </Pressable>
  );
}
