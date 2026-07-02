import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import {
  BOOK_TITLE_LINE_HEIGHT,
  BOOK_TITLE_MARGIN_TOP,
  BOOK_TITLE_MAX_LINES,
  getBookCardCoverHeight,
} from "@/features/books/lib/book-grid-layout";
import { useReadupColors } from "@/shared/constants/readup-theme";

export type BookCardItem = {
  id: number;
  bookId: string;
  workId?: string;
  title: string;
  author?: string;
  cover: string | null;
};

type BookCardProps = {
  item: BookCardItem;
  onPress: (item: BookCardItem) => void;
  width?: number;
  layout?: "default" | "grid";
};

export function BookCard({
  item,
  onPress,
  width = 136,
  layout = "default",
}: BookCardProps) {
  const colors = useReadupColors();
  const coverHeight = getBookCardCoverHeight(width);
  const titleClassName =
    "text-[14px] font-medium leading-[18px] tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]";

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
      {layout === "grid" ? (
        <View
          style={{
            marginTop: BOOK_TITLE_MARGIN_TOP,
            height: BOOK_TITLE_LINE_HEIGHT * BOOK_TITLE_MAX_LINES,
          }}
        >
          <Text className={titleClassName} numberOfLines={BOOK_TITLE_MAX_LINES}>
            {item.title}
          </Text>
        </View>
      ) : (
        <Text className={`mt-2 ${titleClassName}`} numberOfLines={2}>
          {item.title}
        </Text>
      )}
    </Pressable>
  );
}
