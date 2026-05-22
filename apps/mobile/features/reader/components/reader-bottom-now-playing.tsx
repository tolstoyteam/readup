import type { BookDocument } from "@readup/db";
import { audioProgressFraction } from "@/features/reader/audio/audio-progress";
import { useReaderBookAudio } from "@/features/reader/audio/reader-book-audio-context";
import { ReaderBottomBookProgress } from "@/features/reader/components/reader-bottom-book-progress";
import { Pause, Play } from "lucide-react-native";
import { Pressable } from "react-native";

export function ReaderBottomNowPlaying({
  document,
}: {
  document: BookDocument;
}) {
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
          className={`rounded-full border border-[#C8C6B2] bg-[#FBFAF2] p-1.5 active:opacity-80 ${!canToggleAudio ? "opacity-40" : ""}`}
        >
          {status.playing ? (
            <Pause size={24} color="#1A2420" strokeWidth={2} />
          ) : (
            <Play
              size={24}
              color="#1A2420"
              strokeWidth={2}
              style={{ marginLeft: 3 }}
            />
          )}
        </Pressable>
      }
    />
  );
}
