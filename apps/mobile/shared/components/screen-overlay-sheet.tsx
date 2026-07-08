import { type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

type ScreenOverlaySheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  sheetClassName?: string;
};

/**
 * In-tree bottom sheet overlay. Unlike React Native Modal, this stays in the
 * screen component tree and unmounts with its parent — no native modal VC.
 */
export function ScreenOverlaySheet({
  visible,
  onClose,
  children,
  sheetClassName = "rounded-t-2xl border-t border-[#E8E6D8] dark:border-[#2A3630] bg-[#FBFAF2] dark:bg-[#101512]",
}: ScreenOverlaySheetProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Pressable
          className={sheetClassName}
          onPress={(e) => e.stopPropagation()}
        >
          {children}
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
});
