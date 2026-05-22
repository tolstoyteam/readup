import type { BookDocument } from "@readup/db";
import { coverUrl } from "@/features/books/api/books";
import { clampProgressFraction } from "@/features/reader/audio/audio-progress";
import { Image } from "expo-image";
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
  const thumbUri = coverUrl(document.cover_image_path);
  const clampedProgress = clampProgressFraction(progress);

  return (
    <View className="mx-3 mb-3 flex-row items-center gap-3 rounded-xl border border-[#E8E6D8] bg-[#F2F0E6] px-3 py-2.5">
      {thumbUri ? (
        <Image
          source={{ uri: thumbUri }}
          className="h-12 w-12 rounded-md"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View className="h-12 w-12 rounded-md bg-[#E8E6D8]" />
      )}
      <View className="min-w-0 flex-1 gap-2">
        <Text
          className="text-[15px] font-semibold text-[#1A2420]"
          numberOfLines={1}
        >
          {document.title}
        </Text>
        <View className="h-1.5 overflow-hidden rounded-full bg-[#C8C6B2]">
          <View
            className="h-full rounded-full bg-[#059669]"
            style={{ width: `${clampedProgress * 100}%` }}
          />
        </View>
      </View>
      {action}
    </View>
  );
}
