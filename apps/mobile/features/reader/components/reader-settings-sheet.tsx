import {
  FONT_SCALE_STEPS,
  LANGUAGE_OPTIONS,
  LINE_SPACING_OPTIONS,
  MARGIN_OPTIONS,
  type ReaderLanguage,
} from "@/features/reader/settings/reader-settings";
import { useReaderSettings } from "@/features/reader/settings/reader-settings-context";
import { useReadupColors } from "@/shared/constants/readup-theme";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import type { TranslationKey } from "@/shared/i18n/translations";
import { ScreenOverlaySheet } from "@/shared/components/screen-overlay-sheet";
import { Check, Minus, Plus } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

type SegmentedOption = { label: string; value: number };

function SegmentedRow({
  options,
  selected,
  onSelect,
}: {
  options: readonly SegmentedOption[];
  selected: number;
  onSelect: (value: number) => void;
}) {
  return (
    <View className="flex-row gap-1 rounded-xl border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] p-1">
      {options.map((option) => {
        const active = option.value === selected;
        return (
          <Pressable
            key={option.label}
            onPress={() => onSelect(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`flex-1 items-center justify-center rounded-lg py-2.5 ${
              active ? "bg-[#FBFAF2] dark:bg-[#101512]" : "active:opacity-70"
            }`}
          >
            <Text
              className={`text-[13px] font-semibold ${
                active
                  ? "text-[#1A2420] dark:text-[#F3F4EE]"
                  : "text-[#7A7868] dark:text-[#8F9A93]"
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7A7868] dark:text-[#8F9A93]">
      {children}
    </Text>
  );
}

function lineSpacingLabelKey(value: number): TranslationKey {
  if (value === 0.9) return "readerSettings.compact";
  if (value === 1.2) return "readerSettings.relaxed";
  return "readerSettings.normal";
}

function marginLabelKey(value: number): TranslationKey {
  if (value === 16) return "readerSettings.narrow";
  if (value === 32) return "readerSettings.wide";
  return "readerSettings.normal";
}

export function ReaderSettingsSheet({
  visible,
  onClose,
  onLanguageChange,
}: {
  visible: boolean;
  onClose: () => void;
  onLanguageChange?: (language: ReaderLanguage) => void;
}) {
  const colors = useReadupColors();
  const { t } = useInterfaceLanguage();
  const { settings, setFontScale, setLineSpacing, setMargin, setLanguage } =
    useReaderSettings();

  const fontIndex = FONT_SCALE_STEPS.findIndex(
    (step) => step === settings.fontScale,
  );
  const safeFontIndex = fontIndex >= 0 ? fontIndex : 1;
  const canDecreaseFont = safeFontIndex > 0;
  const canIncreaseFont = safeFontIndex < FONT_SCALE_STEPS.length - 1;

  const decreaseFont = () => {
    if (canDecreaseFont) setFontScale(FONT_SCALE_STEPS[safeFontIndex - 1]);
  };
  const increaseFont = () => {
    if (canIncreaseFont) setFontScale(FONT_SCALE_STEPS[safeFontIndex + 1]);
  };

  return (
    <ScreenOverlaySheet
      visible={visible}
      onClose={onClose}
      sheetClassName="gap-6 rounded-t-2xl border-t border-[#E8E6D8] dark:border-[#2A3630] bg-[#FBFAF2] dark:bg-[#101512] px-5 pb-9 pt-5"
    >
          <View className="-mt-1 mb-1 items-center">
            <View className="h-1 w-10 rounded-full bg-[#C8C6B2] dark:bg-[#344039]" />
          </View>

          <Text className="text-lg font-semibold text-[#1A2420] dark:text-[#F3F4EE]">
            {t("readerSettings.title")}
          </Text>

          <View>
            <SectionLabel>{t("readerSettings.fontSize")}</SectionLabel>
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={decreaseFont}
                disabled={!canDecreaseFont}
                accessibilityRole="button"
                accessibilityLabel={t("readerSettings.decreaseFont")}
                className={`h-12 flex-1 items-center justify-center rounded-xl border border-[#C8C6B2] dark:border-[#3A4740] bg-[#F2F0E6] dark:bg-[#19211D] ${
                  canDecreaseFont ? "active:opacity-80" : "opacity-40"
                }`}
              >
                <Minus size={20} color={colors.text} strokeWidth={2.5} />
              </Pressable>
              <View className="min-w-[56px] items-center">
                <Text
                  className="font-reader font-semibold text-[#1A2420] dark:text-[#F3F4EE]"
                  style={{ fontSize: 16 * settings.fontScale }}
                >
                  Aa
                </Text>
              </View>
              <Pressable
                onPress={increaseFont}
                disabled={!canIncreaseFont}
                accessibilityRole="button"
                accessibilityLabel={t("readerSettings.increaseFont")}
                className={`h-12 flex-1 items-center justify-center rounded-xl border border-[#C8C6B2] dark:border-[#3A4740] bg-[#F2F0E6] dark:bg-[#19211D] ${
                  canIncreaseFont ? "active:opacity-80" : "opacity-40"
                }`}
              >
                <Plus size={20} color={colors.text} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>

          <View>
            <SectionLabel>{t("readerSettings.lineSpacing")}</SectionLabel>
            <SegmentedRow
              options={LINE_SPACING_OPTIONS.map((option) => ({
                ...option,
                label: t(lineSpacingLabelKey(option.value)),
              }))}
              selected={settings.lineSpacing}
              onSelect={setLineSpacing}
            />
          </View>

          <View>
            <SectionLabel>{t("readerSettings.margins")}</SectionLabel>
            <SegmentedRow
              options={MARGIN_OPTIONS.map((option) => ({
                ...option,
                label: t(marginLabelKey(option.value)),
              }))}
              selected={settings.margin}
              onSelect={setMargin}
            />
          </View>

          <View>
            <SectionLabel>{t("readerSettings.language")}</SectionLabel>
            <View className="rounded-xl border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] p-1">
              {LANGUAGE_OPTIONS.map((option) => {
                const active = option.value === settings.language;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() =>
                      onLanguageChange
                        ? onLanguageChange(option.value)
                        : setLanguage(option.value)
                    }
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    className={`flex-row items-center justify-between rounded-lg px-3.5 py-3 ${
                      active
                        ? "bg-[#FBFAF2] dark:bg-[#101512]"
                        : "active:opacity-70"
                    }`}
                  >
                    <Text
                      className={`text-base font-medium ${
                        active
                          ? "text-[#1A2420] dark:text-[#F3F4EE]"
                          : "text-[#4A5550] dark:text-[#B8C1BB]"
                      }`}
                    >
                      {option.label}
                    </Text>
                    {active ? (
                      <Check size={20} color="#059669" strokeWidth={2.5} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
    </ScreenOverlaySheet>
  );
}
