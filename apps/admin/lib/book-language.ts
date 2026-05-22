export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "ru", label: "Russian" },
  { value: "kk", label: "Kazakh" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "uk", label: "Ukrainian" },
  { value: "other", label: "Other" },
] as const;

export function languageLabel(code: string): string {
  const found = LANGUAGE_OPTIONS.find((o) => o.value === code);
  return found?.label ?? code;
}
