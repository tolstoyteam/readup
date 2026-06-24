import { colorScheme } from "nativewind";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  loadThemePreference,
  saveThemePreference,
} from "@/shared/theme/theme-preference-storage";
import {
  DEFAULT_THEME_PREFERENCE,
  type ThemePreference,
} from "@/shared/theme/theme-preference";

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  /** True once the persisted preference has been read and applied. */
  loaded: boolean;
  setPreference: (preference: ThemePreference) => void;
};

const ThemePreferenceContext =
  createContext<ThemePreferenceContextValue | null>(null);

function applyThemePreference(preference: ThemePreference) {
  colorScheme.set(preference);
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    DEFAULT_THEME_PREFERENCE,
  );
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    void loadThemePreference().then((stored) => {
      if (!mounted) return;
      applyThemePreference(stored);
      setPreferenceState(stored);
      loadedRef.current = true;
      setLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    void saveThemePreference(preference);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    applyThemePreference(next);
    setPreferenceState(next);
  }, []);

  const value = useMemo<ThemePreferenceContextValue>(
    () => ({
      preference,
      loaded,
      setPreference,
    }),
    [preference, loaded, setPreference],
  );

  if (!loaded) {
    return null;
  }

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceContextValue {
  const ctx = useContext(ThemePreferenceContext);
  if (ctx == null) {
    throw new Error(
      "useThemePreference must be used within ThemePreferenceProvider",
    );
  }
  return ctx;
}
