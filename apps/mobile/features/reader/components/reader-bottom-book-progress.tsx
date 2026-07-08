import type { BookDocument } from "@readup/db/shared";
import { coverUrl } from "@/features/books/api/books";
import { BookCoverImage } from "@/features/books/components/book-cover-image";
import { clampProgressFraction } from "@/features/reader/audio/audio-progress";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

export function ReaderBottomBookProgress({
  document,
  progress,
  action,
}: {
  document: BookDocument;
  progress: number;
  action?: ReactNode;
}) {
  const clampedProgress = clampProgressFraction(progress);

  return (
    <View className="w-full flex-row items-center gap-3 bg-[#F2F0E6] px-6 pt-2.5 pb-4 dark:bg-[#19211D]">
      <View className="shrink-0">
        <BookCoverImage
          uri={coverUrl(document.cover_image_path)}
          title={document.title}
          variant="thumbnail"
        />
      </View>
      <View className="min-w-0 flex-1 gap-2">
        <Text
          className="text-[15px] font-semibold text-[#1A2420] dark:text-[#F3F4EE]"
          numberOfLines={1}
        >
          {document.title}
        </Text>
        <View className="h-1.5 w-full overflow-hidden rounded-full bg-[#C8C6B2] dark:bg-[#344039]">
          <View
            className="h-full rounded-full bg-[#059669]"
            style={{ width: `${clampedProgress * 100}%` }}
          />
        </View>
      </View>
      {action ? <View className="shrink-0">{action}</View> : null}
    </View>
  );
}
