import type { BookDocument } from "@readup/db";
import { coverUrl } from "@/features/books/api/books";
import { audioProgressFraction } from "@/features/reader/audio/audio-progress";
import { useReaderBookAudio } from "@/features/reader/audio/reader-book-audio-context";
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

export function BookListenPlayer({ document }: { document: BookDocument }) {
  const {
    voice,
    setVoice,
    voices,
    audioUrl,
    isAudioLoading,
    status,
    togglePlayback,
    seekToFraction,
  } = useReaderBookAudio();
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false);
  const [barWidth, setBarWidth] = useState(1);

  const thumbUri = coverUrl(document.cover_image_path);
  const currentVoiceLabel =
    voices.find((v) => v.id === voice)?.label ?? voice;
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

  const showSpinner = isAudioLoading || Boolean(audioUrl && !status.isLoaded);

  return (
    <View className="flex-1 justify-between bg-[#FBFAF2] px-6 pb-4 pt-2">
      <View className="items-center pt-4">
        <View className="overflow-hidden rounded-2xl border border-[#E8E6D8]">
          {thumbUri ? (
            <Image
              source={{ uri: thumbUri }}
              className="h-[220px] w-[220px]"
              accessibilityLabel="Book cover"
            />
          ) : (
            <View className="h-[220px] w-[220px] items-center justify-center bg-[#F2F0E6]">
              <BookOpen size={56} color="#7A7868" strokeWidth={1.5} />
            </View>
          )}
        </View>
        <Text
          className="mt-6 text-center font-reader text-xl font-semibold text-[#1A2420]"
          numberOfLines={2}
        >
          {document.title}
        </Text>
        {document.author ? (
          <Text
            className="mt-1 text-center text-sm text-[#4A5550]"
            numberOfLines={1}
          >
            {document.author}
          </Text>
        ) : null}

        <View className="mt-8 w-full max-w-sm">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7A7868]">
            Voice
          </Text>
          <Pressable
            onPress={() => setVoiceMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Choose narration voice"
            className="flex-row items-center justify-between rounded-xl border border-[#E8E6D8] bg-[#F2F0E6] px-4 py-3.5 active:opacity-90"
          >
            <Text className="text-base font-medium text-[#1A2420]">
              {currentVoiceLabel}
            </Text>
            <ChevronDown size={20} color="#4A5550" strokeWidth={2} />
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
            <View className="h-1.5 w-full overflow-hidden rounded-full bg-[#C8C6B2]">
              <View
                className="h-full rounded-full bg-[#059669]"
                style={{ width: `${progress * 100}%` }}
              />
            </View>
          </Pressable>
          <View className="flex-row justify-between px-0.5">
            <Text className="font-mono text-xs text-[#4A5550]">
              {formatClock(current)}
            </Text>
            <Text className="font-mono text-xs text-[#4A5550]">
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
            className="h-12 w-12 items-center justify-center rounded-full border border-[#C8C6B2] bg-[#F2F0E6] active:opacity-80"
          >
            <RotateCcw size={22} color="#1A2420" strokeWidth={2} />
          </Pressable>

          <Pressable
            onPress={togglePlayback}
            disabled={!audioUrl || isAudioLoading}
            accessibilityRole="button"
            accessibilityLabel={status.playing ? "Pause" : "Play"}
            className="h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-[#047857] bg-[#059669] active:opacity-90"
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
            className="h-12 w-12 items-center justify-center rounded-full border border-[#C8C6B2] bg-[#F2F0E6] active:opacity-80"
          >
            <RotateCw size={22} color="#1A2420" strokeWidth={2} />
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
            className="rounded-t-2xl border-t border-[#E8E6D8] bg-[#FBFAF2] px-2 pb-8 pt-3"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="mb-2 px-3 text-sm font-semibold text-[#7A7868]">
              Narration voice
            </Text>
            {voices.map((v) => (
              <Pressable
                key={v.id}
                onPress={() => {
                  setVoice(v.id);
                  setVoiceMenuOpen(false);
                }}
                className={`flex-row items-center justify-between rounded-xl px-3 py-3.5 active:bg-[#F2F0E6] ${
                  voice === v.id ? "bg-[#F2F0E6]" : ""
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: voice === v.id }}
              >
                <Text className="text-base font-medium text-[#1A2420]">
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
