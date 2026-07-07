import type { BookDocument } from "@readup/db/shared";
import { ReaderBottomNowPlaying } from "@/features/reader/components/reader-bottom-now-playing";
import { ReaderBottomReadingProgress } from "@/features/reader/components/reader-bottom-reading-progress";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

export function ReaderReadFooter({
  document,
  hasAudio,
  pageIndex,
  pages,
  totalPages,
  pageLabel,
  pageProgress,
  goNext,
  goPrev,
}: {
  document: BookDocument;
  hasAudio: boolean;
  pageIndex: number;
  pages: NonNullable<BookDocument["pages"]>;
  totalPages: number;
  pageLabel: number;
  pageProgress: number;
  goNext: () => void;
  goPrev: () => void;
}) {
  const { t } = useInterfaceLanguage();

  return (
    <>
      <View className="flex-row items-center justify-center gap-5 border-t border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] py-3">
        <Pressable
          onPress={goPrev}
          disabled={pageIndex <= 0}
          className={`h-10 w-10 items-center justify-center rounded-[10px] ${
            pageIndex <= 0
              ? "border border-[#E8E6D8] dark:border-[#2A3630] bg-[#FBFAF2] dark:bg-[#101512]"
              : "border border-[#C8C6B2] dark:border-[#3A4740] bg-[#FBFAF2] dark:bg-[#101512] active:opacity-80"
          }`}
        >
          <ChevronLeft
            size={22}
            color={pageIndex <= 0 ? "#A8A58F" : "#1A2420"}
            strokeWidth={2}
          />
        </Pressable>
        <Text className="min-w-[72px] text-center text-sm font-medium text-[#4A5550] dark:text-[#B8C1BB]">
          {t("reader.pageProgress", {
            page: pageLabel,
            total: totalPages || pages.length,
          })}
        </Text>
        <Pressable
          onPress={goNext}
          disabled={pageIndex >= pages.length - 1}
          className={`h-10 w-10 items-center justify-center rounded-[10px] ${
            pageIndex >= pages.length - 1
              ? "border border-[#E8E6D8] dark:border-[#2A3630] bg-[#FBFAF2] dark:bg-[#101512]"
              : "border border-[#C8C6B2] dark:border-[#3A4740] bg-[#FBFAF2] dark:bg-[#101512] active:opacity-80"
          }`}
        >
          <ChevronRight
            size={22}
            color={pageIndex >= pages.length - 1 ? "#A8A58F" : "#1A2420"}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {hasAudio ? (
        <ReaderBottomNowPlaying document={document} />
      ) : (
        <ReaderBottomReadingProgress
          document={document}
          pageProgress={pageProgress}
        />
      )}
    </>
  );
}
