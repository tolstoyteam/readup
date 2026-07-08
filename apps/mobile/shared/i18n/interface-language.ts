export type InterfaceLanguage = "ru" | "en" | "es";

export const DEFAULT_INTERFACE_LANGUAGE: InterfaceLanguage = "ru";

export function interfaceLanguageFromLocale(
  locale: string | null | undefined,
): InterfaceLanguage {
  const languageCode = locale?.split(/[-_]/)[0]?.toLowerCase();
  if (languageCode === "ru" || languageCode === "es") return languageCode;
  if (languageCode === "en") return "en";
  return "en";
}

export type InterfaceContentLanguage = "ru" | "en";

export function contentLanguageForInterface(
  language: InterfaceLanguage,
): InterfaceContentLanguage {
  return language === "ru" ? "ru" : "en";
}
