export type InterfaceLanguage = "ru" | "en" | "es";

export const DEFAULT_INTERFACE_LANGUAGE: InterfaceLanguage = "ru";

export type InterfaceContentLanguage = "ru" | "en";

export function contentLanguageForInterface(
  language: InterfaceLanguage,
): InterfaceContentLanguage {
  return language === "ru" ? "ru" : "en";
}
