import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";

import {
  DEFAULT_INTERFACE_LANGUAGE,
  interfaceLanguageFromLocale,
  type InterfaceLanguage,
} from "@/shared/i18n/interface-language";

const KEY = "@readup/interface_language";

function sanitize(raw: unknown): InterfaceLanguage {
  if (raw === "ru" || raw === "en" || raw === "es") return raw;
  return DEFAULT_INTERFACE_LANGUAGE;
}

export async function loadInterfaceLanguage(): Promise<InterfaceLanguage> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (!stored) {
      return interfaceLanguageFromLocale(getLocales()[0]?.languageTag);
    }
    return sanitize(stored);
  } catch {
    return DEFAULT_INTERFACE_LANGUAGE;
  }
}

export async function saveInterfaceLanguage(
  language: InterfaceLanguage,
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, language);
  } catch {
    // Persistence is best-effort; language switching must not break the app.
  }
}
