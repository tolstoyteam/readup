import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Pressable } from "react-native";

export function HapticTab({
  onPressIn,
  ref: _ref,
  ...props
}: BottomTabBarButtonProps) {
  return (
    <Pressable
      {...props}
      onPressIn={(event) => {
        onPressIn?.(event);
        if (process.env.EXPO_OS === "ios") {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }}
    />
  );
}
