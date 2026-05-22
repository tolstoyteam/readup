import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Pressable } from "react-native";

export function HapticTab({
  onPress,
  onPressIn,
  children,
  style,
  accessibilityRole,
  accessibilityState,
  accessibilityLabel,
  testID,
}: BottomTabBarButtonProps) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={style}
      onPress={process.env.EXPO_OS === "web" ? onPress : undefined}
      onPressIn={(event) => {
        onPressIn?.(event);
        if (process.env.EXPO_OS === "ios") {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (process.env.EXPO_OS !== "web") {
          onPress?.(event);
        }
      }}
    >
      {children}
    </Pressable>
  );
}
