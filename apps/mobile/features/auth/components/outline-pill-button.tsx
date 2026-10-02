import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SocialProviderIcon } from "@/features/auth/components/social-provider-icon";
import { useReadupColors } from "@/shared/constants/readup-theme";

type OutlinePillButtonProps = Omit<PressableProps, "style"> & {
  label: string;
  provider?: "apple" | "google";
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function OutlinePillButton({
  label,
  provider,
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
          minHeight: 50,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
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
        <>
          {provider === "apple" ? (
            <View style={{ position: "absolute", left: 18 }}><SocialProviderIcon provider="apple" /></View>
          ) : provider === "google" ? (
            <View style={{ position: "absolute", left: 18 }}><SocialProviderIcon provider="google" /></View>
          ) : null}
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
