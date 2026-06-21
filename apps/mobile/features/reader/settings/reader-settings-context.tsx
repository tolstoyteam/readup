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
  DEFAULT_READER_SETTINGS,
  type ReaderLanguage,
  type ReaderSettings,
} from "@/features/reader/settings/reader-settings";
import {
  loadReaderSettings,
  saveReaderSettings,
} from "@/features/reader/settings/reader-settings-storage";

type ReaderSettingsContextValue = {
  settings: ReaderSettings;
  /** True once the persisted settings have been read from storage. */
  loaded: boolean;
  setFontScale: (fontScale: number) => void;
  setLineSpacing: (lineSpacing: number) => void;
  setMargin: (margin: number) => void;
  setLanguage: (language: ReaderLanguage) => void;
};

const ReaderSettingsContext = createContext<ReaderSettingsContextValue | null>(
  null,
);

export function ReaderSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ReaderSettings>(
    DEFAULT_READER_SETTINGS,
  );
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    void loadReaderSettings().then((stored) => {
      if (!mounted) return;
      setSettings(stored);
      loadedRef.current = true;
      setLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    void saveReaderSettings(settings);
  }, [settings]);

  const setFontScale = useCallback((fontScale: number) => {
    setSettings((prev) => ({ ...prev, fontScale }));
  }, []);

  const setLineSpacing = useCallback((lineSpacing: number) => {
    setSettings((prev) => ({ ...prev, lineSpacing }));
  }, []);

  const setMargin = useCallback((margin: number) => {
    setSettings((prev) => ({ ...prev, margin }));
  }, []);

  const setLanguage = useCallback((language: ReaderLanguage) => {
    setSettings((prev) => ({ ...prev, language }));
  }, []);

  const value = useMemo<ReaderSettingsContextValue>(
    () => ({
      settings,
      loaded,
      setFontScale,
      setLineSpacing,
      setMargin,
      setLanguage,
    }),
    [settings, loaded, setFontScale, setLineSpacing, setMargin, setLanguage],
  );

  return (
    <ReaderSettingsContext.Provider value={value}>
      {children}
    </ReaderSettingsContext.Provider>
  );
}

export function useReaderSettings(): ReaderSettingsContextValue {
  const ctx = useContext(ReaderSettingsContext);
  if (ctx == null) {
    throw new Error(
      "useReaderSettings must be used within ReaderSettingsProvider",
    );
  }
  return ctx;
}
