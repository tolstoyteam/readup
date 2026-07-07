import type { BookAudioVoice } from "@/features/books/api/book-audio";
import { useReaderBookAudio } from "@/features/reader/audio/reader-book-audio-context";
import { ScreenOverlaySheet } from "@/shared/components/screen-overlay-sheet";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import { Check } from "lucide-react-native";
import { Pressable, Text } from "react-native";

type VoiceOption = { id: BookAudioVoice; label: string };

export function ReaderVoicePickerSheet({
  visible,
  onClose,
  voice,
  voices,
  onSelectVoice,
}: {
  visible: boolean;
  onClose: () => void;
  voice: BookAudioVoice;
  voices: readonly VoiceOption[];
  onSelectVoice: (voice: BookAudioVoice) => void;
}) {
  const { t } = useInterfaceLanguage();

  return (
    <ScreenOverlaySheet
      visible={visible}
      onClose={onClose}
      sheetClassName="rounded-t-2xl border-t border-[#E8E6D8] dark:border-[#2A3630] bg-[#FBFAF2] dark:bg-[#101512] px-2 pb-8 pt-3"
    >
      <Text className="mb-2 px-3 text-sm font-semibold text-[#7A7868] dark:text-[#8F9A93]">
        {t("reader.narrationVoice")}
      </Text>
      {voices.map((v) => (
        <Pressable
          key={v.id}
          onPress={() => {
            onSelectVoice(v.id);
            onClose();
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
    </ScreenOverlaySheet>
  );
}

export function ReaderVoicePickerOverlay({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { voice, setVoice, voices } = useReaderBookAudio();

  return (
    <ReaderVoicePickerSheet
      visible={visible}
      onClose={onClose}
      voice={voice}
      voices={voices}
      onSelectVoice={setVoice}
    />
  );
}
