import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { useReadupColors } from "@/shared/constants/readup-theme";

export type BookCardItem = {
  id: number;
  bookId: string;
  title: string;
  author?: string;
  cover: string | null;
};

type BookCardProps = {
  item: BookCardItem;
  onPress: (item: BookCardItem) => void;
  width?: number;
};

export function BookCard({ item, onPress, width = 136 }: BookCardProps) {
  const colors = useReadupColors();
  const coverHeight = Math.round(width * 1.44);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
      onPress={() => onPress(item)}
      className="active:opacity-85"
      style={{ width }}
    >
      <View
        className="overflow-hidden rounded-[10px]"
        style={{ height: coverHeight, backgroundColor: colors.surface }}
      >
        {item.cover ? (
          <Image
            source={{ uri: item.cover }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={180}
            cachePolicy="memory-disk"
          />
        ) : (
          <View className="h-full items-center justify-center px-3">
            <Text className="text-center text-[13px] font-medium text-[#4A5550] dark:text-[#B8C1BB]">
              {item.title}
            </Text>
          </View>
        )}
      </View>
      <Text
        className="mt-2 text-[14px] font-medium leading-[18px] tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]"
        numberOfLines={2}
      >
        {item.title}
      </Text>
    </Pressable>
  );
}
