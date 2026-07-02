export type ReaderLanguage = "en" | "ru";

export type ReaderSettings = {
  /** Multiplier applied to base reader font sizes. */
  fontScale: number;
  /** Multiplier applied to base reader line heights. */
  lineSpacing: number;
  /** Horizontal page padding in px. */
  margin: number;
  /** Preferred edition language when a work has multiple published editions. */
  language: ReaderLanguage;
};

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontScale: 1,
  lineSpacing: 1,
  margin: 22,
  language: "ru",
};

export const FONT_SCALE_STEPS = [0.85, 1, 1.15, 1.3, 1.45] as const;

export const LINE_SPACING_OPTIONS = [
  { label: "Compact", value: 0.9 },
  { label: "Normal", value: 1 },
  { label: "Relaxed", value: 1.2 },
] as const;

export const MARGIN_OPTIONS = [
  { label: "Narrow", value: 16 },
  { label: "Normal", value: 22 },
  { label: "Wide", value: 32 },
] as const;

export const LANGUAGE_OPTIONS: { value: ReaderLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" },
];
