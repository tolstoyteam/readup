import type { BookDocument } from "@readup/db";
import { audioProgressFraction } from "@/features/reader/audio/audio-progress";
import { useReaderBookAudio } from "@/features/reader/audio/reader-book-audio-context";
import { ReaderBottomBookProgress } from "@/features/reader/components/reader-bottom-book-progress";
import { useReadupColors } from "@/shared/constants/readup-theme";
import { Pause, Play } from "lucide-react-native";
import { Pressable } from "react-native";

export function ReaderBottomNowPlaying({
  document,
}: {
  document: BookDocument;
}) {
  const colors = useReadupColors();
  const { audioUrl, isAudioLoading, status, togglePlayback } =
    useReaderBookAudio();

  const audioProgress = audioProgressFraction(
    status.currentTime,
    status.duration,
  );

  const canToggleAudio = Boolean(audioUrl) && !isAudioLoading;

  return (
    <ReaderBottomBookProgress
      document={document}
      progress={audioProgress}
      action={
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={status.playing ? "Pause audio" : "Play audio"}
          disabled={!canToggleAudio}
          onPress={togglePlayback}
          className={`rounded-full border border-[#C8C6B2] dark:border-[#3A4740] bg-[#FBFAF2] dark:bg-[#101512] p-1.5 active:opacity-80 ${!canToggleAudio ? "opacity-40" : ""}`}
        >
          {status.playing ? (
            <Pause size={24} color={colors.text} strokeWidth={2} />
          ) : (
            <Play
              size={24}
              color={colors.text}
              strokeWidth={2}
              style={{ marginLeft: 3 }}
            />
          )}
        </Pressable>
      }
    />
  );
}
