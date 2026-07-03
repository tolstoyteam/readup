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
  DEFAULT_INTERFACE_LANGUAGE,
  type InterfaceLanguage,
} from "@/shared/i18n/interface-language";
import {
  loadInterfaceLanguage,
  saveInterfaceLanguage,
} from "@/shared/i18n/interface-language-storage";
import { translations, type TranslationKey } from "@/shared/i18n/translations";

type TranslationValues = Record<string, string | number>;

type InterfaceLanguageContextValue = {
  language: InterfaceLanguage;
  loaded: boolean;
  setLanguage: (language: InterfaceLanguage) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
};

const InterfaceLanguageContext =
  createContext<InterfaceLanguageContextValue | null>(null);

export function InterfaceLanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [language, setLanguageState] = useState<InterfaceLanguage>(
    DEFAULT_INTERFACE_LANGUAGE,
  );
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    void loadInterfaceLanguage().then((stored) => {
      if (!mounted) return;
      setLanguageState(stored);
      loadedRef.current = true;
      setLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    void saveInterfaceLanguage(language);
  }, [language]);

  const setLanguage = useCallback((next: InterfaceLanguage) => {
    setLanguageState(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, values?: TranslationValues) => {
      let text: string = translations[language][key] ?? translations.ru[key];
      if (!values) return text;

      for (const [name, value] of Object.entries(values)) {
        text = text.replaceAll(`{{${name}}}`, String(value));
      }
      return text;
    },
    [language],
  );

  const value = useMemo<InterfaceLanguageContextValue>(
    () => ({
      language,
      loaded,
      setLanguage,
      t,
    }),
    [language, loaded, setLanguage, t],
  );

  if (!loaded) {
    return null;
  }

  return (
    <InterfaceLanguageContext.Provider value={value}>
      {children}
    </InterfaceLanguageContext.Provider>
  );
}

export function useInterfaceLanguage(): InterfaceLanguageContextValue {
  const ctx = useContext(InterfaceLanguageContext);
  if (ctx == null) {
    throw new Error(
      "useInterfaceLanguage must be used within InterfaceLanguageProvider",
    );
  }
  return ctx;
}
