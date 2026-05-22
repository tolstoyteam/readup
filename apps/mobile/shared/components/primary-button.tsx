import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { ReadupColors } from "@/shared/constants/readup-theme";

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
          borderColor: ReadupColors.brandDark,
          backgroundColor: ReadupColors.brand,
          opacity: isDisabled ? 0.62 : 1,
        },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={ReadupColors.textInverse} />
      ) : (
        <Text className="text-center text-[18px] font-medium tracking-[-0.72px] text-[#FBFAF2]">
          {label}
        </Text>
      )}
    </Pressable>
  );
}
