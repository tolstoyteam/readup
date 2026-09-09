import { type ReactNode } from "react";
import { Modal, StyleSheet, View } from "react-native";

import { useReadupColors } from "@/shared/constants/readup-theme";

type ScreenOverlaySheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  sheetClassName?: string;
};

export function ScreenOverlaySheet({
  visible,
  onClose,
  children,
  sheetClassName = "rounded-t-2xl border-t border-[#E8E6D8] dark:border-[#2A3630] bg-[#FBFAF2] dark:bg-[#101512]",
}: ScreenOverlaySheetProps) {
  const colors = useReadupColors();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      allowSwipeDismissal
      onRequestClose={onClose}
    >
      <View
        style={[styles.sheetHost, { backgroundColor: colors.background }]}
      >
        <View className={sheetClassName} style={styles.sheetContent}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetHost: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetContent: {
    width: "100%",
  },
});
