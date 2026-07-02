import { Pressable, Text, View } from "react-native";

type SelectionToolbarProps = {
  visible: boolean;
  onSave: () => void;
  onDismiss: () => void;
  saving?: boolean;
};

export function SelectionToolbar({
  visible,
  onSave,
  onDismiss,
  saving = false,
}: SelectionToolbarProps) {
  if (!visible) return null;

  return (
    <View className="absolute left-0 right-0 top-0 z-50 items-center px-4 pt-2">
      <View className="flex-row items-center gap-2 rounded-[12px] border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] px-3 py-2 shadow-sm">
        <Pressable
          onPress={onSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Save quote"
          className={`rounded-full bg-[#059669] px-4 py-2 active:opacity-90 ${saving ? "opacity-70" : ""}`}
        >
          <Text className="text-[13px] font-medium tracking-[-0.52px] text-[#FBFAF2]">
            {saving ? "Saving…" : "Save Quote"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss selection"
          className="px-2 py-2 active:opacity-70"
        >
          <Text className="text-[12px] font-medium text-[#7A7868] dark:text-[#8F9A93]">
            Cancel
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
