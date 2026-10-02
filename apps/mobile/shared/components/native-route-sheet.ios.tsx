import { BottomSheet, RNHostView } from "@expo/ui";
import { router } from "expo-router";
import { useRef, useState, type ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";

import { useReadupColors } from "@/shared/constants/readup-theme";

type NativeRouteSheetProps = {
  children: ReactNode;
  heightFraction?: number;
};

export function NativeRouteSheet({
  children,
  heightFraction = 0.86,
}: NativeRouteSheetProps) {
  const colors = useReadupColors();
  const { height, width } = useWindowDimensions();
  const [isPresented, setIsPresented] = useState(true);
  const dismissedRef = useRef(false);

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <BottomSheet
        isPresented={isPresented}
        onDismiss={() => {
          if (dismissedRef.current) return;
          dismissedRef.current = true;
          setIsPresented(false);
          if (router.canGoBack()) router.back();
          else router.replace("/");
        }}
        snapPoints={[{ fraction: heightFraction }]}
        showDragIndicator
        contentPadding={0}
        containerColor={colors.background}
      >
        <RNHostView matchContents>
          <View
            style={{
              width,
              height: Math.max(320, height * heightFraction - 40),
              paddingTop: 56,
              backgroundColor: colors.background,
            }}
          >
            {children}
          </View>
        </RNHostView>
      </BottomSheet>
    </View>
  );
}
