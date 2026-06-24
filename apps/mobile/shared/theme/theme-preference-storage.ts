import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DEFAULT_THEME_PREFERENCE,
  type ThemePreference,
} from "@/shared/theme/theme-preference";

const KEY = "@readup/theme_preference";

function sanitize(raw: unknown): ThemePreference {
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return DEFAULT_THEME_PREFERENCE;
}

export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (!stored) return DEFAULT_THEME_PREFERENCE;
    return sanitize(stored);
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export async function saveThemePreference(
  preference: ThemePreference,
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, preference);
  } catch {
    // Persistence is best-effort; theme switching must not break the app.
  }
}
