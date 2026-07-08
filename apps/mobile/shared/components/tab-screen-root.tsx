import { useIsFocused } from "@react-navigation/native";
import { type ReactNode } from "react";
import { View } from "react-native";

type TabScreenRootProps = {
  children: ReactNode;
};

/** Prevents unfocused tab screens from intercepting touches above the tab bar. */
export function TabScreenRoot({ children }: TabScreenRootProps) {
  const isFocused = useIsFocused();

  return (
    <View style={{ flex: 1 }} pointerEvents={isFocused ? "auto" : "none"}>
      {children}
    </View>
  );
}
