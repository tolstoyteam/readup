import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DEFAULT_READER_SETTINGS,
  type ReaderSettings,
} from "@/features/reader/settings/reader-settings";

const KEY = "@readup/reader_settings";

function sanitize(raw: unknown): ReaderSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_READER_SETTINGS;
  const value = raw as Partial<ReaderSettings>;
  return {
    fontScale:
      typeof value.fontScale === "number" && Number.isFinite(value.fontScale)
        ? value.fontScale
        : DEFAULT_READER_SETTINGS.fontScale,
    lineSpacing:
      typeof value.lineSpacing === "number" &&
      Number.isFinite(value.lineSpacing)
        ? value.lineSpacing
        : DEFAULT_READER_SETTINGS.lineSpacing,
    margin:
      typeof value.margin === "number" && Number.isFinite(value.margin)
        ? value.margin
        : DEFAULT_READER_SETTINGS.margin,
    language:
      value.language === "en" || value.language === "ru"
        ? value.language
        : DEFAULT_READER_SETTINGS.language,
  };
}

export async function loadReaderSettings(): Promise<ReaderSettings> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (!stored) return DEFAULT_READER_SETTINGS;
    return sanitize(JSON.parse(stored));
  } catch {
    return DEFAULT_READER_SETTINGS;
  }
}

export async function saveReaderSettings(
  settings: ReaderSettings,
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Persistence is best-effort; reading must not break if storage fails.
  }
}
