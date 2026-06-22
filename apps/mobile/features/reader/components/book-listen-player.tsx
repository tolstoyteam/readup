import type { BookDocument } from "@readup/db";
import { coverUrl } from "@/features/books/api/books";
import { audioProgressFraction } from "@/features/reader/audio/audio-progress";
import { useReaderBookAudio } from "@/features/reader/audio/reader-book-audio-context";
import { useReadupColors } from "@/shared/constants/readup-theme";
import {
  ReaderListenError,
  ReaderListenLoading,
} from "@/features/reader/components/reader-listen-states";
import { Image } from "expo-image";
import {
  BookOpen,
  Check,
  ChevronDown,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function BookListenPlayer({
  document,
  onRetryAudio,
}: {
  document: BookDocument;
  onRetryAudio?: () => void;
}) {
  const colors = useReadupColors();
  const {
    voice,
    setVoice,
    voices,
    audioUrl,
    isAudioLoading,
    loadError,
    status,
    togglePlayback,
    seekToFraction,
    retryVoiceLoad,
  } = useReaderBookAudio();
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false);
  const [barWidth, setBarWidth] = useState(1);

  const thumbUri = coverUrl(document.cover_image_path);
  const currentVoiceLabel = voices.find((v) => v.id === voice)?.label ?? voice;
  const duration = status.duration;
  const current = status.currentTime;
  const progress = audioProgressFraction(current, duration);

  const onBarLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setBarWidth(w);
  }, []);

  const onSeekPress = useCallback(
    (x: number) => {
      if (barWidth <= 0) return;
      seekToFraction(x / barWidth);
    },
    [barWidth, seekToFraction],
  );

  const handleRetry = useCallback(() => {
    if (loadError) {
      retryVoiceLoad();
      return;
    }
    onRetryAudio?.();
  }, [loadError, onRetryAudio, retryVoiceLoad]);

  const showSpinner = isAudioLoading || Boolean(audioUrl && !status.isLoaded);

  if (isAudioLoading && !audioUrl && !loadError) {
    return <ReaderListenLoading message="Загрузка аудио…" />;
  }

  if (loadError || (!isAudioLoading && !audioUrl)) {
    return (
      <ReaderListenError
        message={
          loadError ?? "Аудио недоступно для этой книги. Попробуйте ещё раз."
        }
        onRetry={handleRetry}
      />
    );
  }

  return (
    <View className="flex-1 justify-between bg-[#FBFAF2] dark:bg-[#101512] px-6 pb-4 pt-2">
      <View className="items-center pt-4">
        <View className="overflow-hidden rounded-2xl border border-[#E8E6D8] dark:border-[#2A3630]">
          {thumbUri ? (
            <Image
              source={{ uri: thumbUri }}
              className="h-[220px] w-[220px]"
              accessibilityLabel="Book cover"
            />
          ) : (
            <View className="h-[220px] w-[220px] items-center justify-center bg-[#F2F0E6] dark:bg-[#19211D]">
              <BookOpen size={56} color={colors.textTertiary} strokeWidth={1.5} />
            </View>
          )}
        </View>
        <Text
          className="mt-6 text-center font-reader text-xl font-semibold text-[#1A2420] dark:text-[#F3F4EE]"
          numberOfLines={2}
        >
          {document.title}
        </Text>
        {document.author ? (
          <Text
            className="mt-1 text-center text-sm text-[#4A5550] dark:text-[#B8C1BB]"
            numberOfLines={1}
          >
            {document.author}
          </Text>
        ) : null}

        <View className="mt-8 w-full max-w-sm">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7A7868] dark:text-[#8F9A93]">
            Voice
          </Text>
          <Pressable
            onPress={() => setVoiceMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Choose narration voice"
            className="flex-row items-center justify-between rounded-xl border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] px-4 py-3.5 active:opacity-90"
          >
            <Text className="text-base font-medium text-[#1A2420] dark:text-[#F3F4EE]">
              {currentVoiceLabel}
            </Text>
            <ChevronDown size={20} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <View className="gap-5 pb-2">
        <View className="gap-2">
          <Pressable
            onPress={(e) => onSeekPress(e.nativeEvent.locationX)}
            onLayout={onBarLayout}
            accessibilityRole="adjustable"
            accessibilityLabel="Playback position"
            className="h-10 w-full justify-center rounded-lg bg-transparent"
          >
            <View className="h-1.5 w-full overflow-hidden rounded-full bg-[#C8C6B2] dark:bg-[#344039]">
              <View
                className="h-full rounded-full bg-[#059669]"
                style={{ width: `${progress * 100}%` }}
              />
            </View>
          </Pressable>
          <View className="flex-row justify-between px-0.5">
            <Text className="font-mono text-xs text-[#4A5550] dark:text-[#B8C1BB]">
              {formatClock(current)}
            </Text>
            <Text className="font-mono text-xs text-[#4A5550] dark:text-[#B8C1BB]">
              -{formatClock(Math.max(0, duration - current))}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-center gap-10">
          <Pressable
            onPress={() => seekToFraction(Math.max(0, progress - 0.1))}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Rewind ten percent"
            className="h-12 w-12 items-center justify-center rounded-full border border-[#C8C6B2] dark:border-[#3A4740] bg-[#F2F0E6] dark:bg-[#19211D] active:opacity-80"
          >
            <RotateCcw size={22} color={colors.text} strokeWidth={2} />
          </Pressable>

          <Pressable
            onPress={togglePlayback}
            disabled={!audioUrl || isAudioLoading}
            accessibilityRole="button"
            accessibilityLabel={status.playing ? "Pause" : "Play"}
            className="h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-[#047857] dark:border-[#10B981] bg-[#059669] active:opacity-90"
          >
            {showSpinner ? (
              <ActivityIndicator color="#FBFAF2" />
            ) : status.playing ? (
              <Pause size={36} color="#FBFAF2" strokeWidth={2} />
            ) : (
              <Play
                size={36}
                color="#FBFAF2"
                strokeWidth={2}
                style={{ marginLeft: 4 }}
              />
            )}
          </Pressable>

          <Pressable
            onPress={() => seekToFraction(Math.min(1, progress + 0.1))}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Forward ten percent"
            className="h-12 w-12 items-center justify-center rounded-full border border-[#C8C6B2] dark:border-[#3A4740] bg-[#F2F0E6] dark:bg-[#19211D] active:opacity-80"
          >
            <RotateCw size={22} color={colors.text} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <Modal
        visible={voiceMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setVoiceMenuOpen(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/55"
          onPress={() => setVoiceMenuOpen(false)}
        >
          <Pressable
            className="rounded-t-2xl border-t border-[#E8E6D8] dark:border-[#2A3630] bg-[#FBFAF2] dark:bg-[#101512] px-2 pb-8 pt-3"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="mb-2 px-3 text-sm font-semibold text-[#7A7868] dark:text-[#8F9A93]">
              Narration voice
            </Text>
            {voices.map((v) => (
              <Pressable
                key={v.id}
                onPress={() => {
                  setVoice(v.id);
                  setVoiceMenuOpen(false);
                }}
                className={`flex-row items-center justify-between rounded-xl px-3 py-3.5 active:bg-[#F2F0E6] dark:bg-[#19211D] ${
                  voice === v.id ? "bg-[#F2F0E6] dark:bg-[#19211D]" : ""
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: voice === v.id }}
              >
                <Text className="text-base font-medium text-[#1A2420] dark:text-[#F3F4EE]">
                  {v.label}
                </Text>
                {voice === v.id ? (
                  <Check size={22} color="#059669" strokeWidth={2.5} />
                ) : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
