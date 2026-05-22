/** Short spoken labels for TTS, keyed by book `language` (same codes as LANGUAGE_OPTIONS). */
export type TtsPhrases = {
  titleLabel: string;
  authorLabel: string;
  /** Spoken immediately before a quote block (include trailing pause punctuation). */
  quotePrefix: string;
  /** Spoken immediately before a keywords block. */
  keywordsPrefix: string;
};

const PHRASES: Record<string, TtsPhrases> = {
  en: {
    titleLabel: "Title",
    authorLabel: "Author",
    quotePrefix: "Quote.",
    keywordsPrefix: "Keywords.",
  },
  ru: {
    titleLabel: "Название",
    authorLabel: "Автор",
    quotePrefix: "Цитата.",
    keywordsPrefix: "Ключевые слова.",
  },
  kk: {
    titleLabel: "Атауы",
    authorLabel: "Авторы",
    quotePrefix: "Дәйексөз.",
    keywordsPrefix: "Кілт сөздер.",
  },
  es: {
    titleLabel: "Título",
    authorLabel: "Autor",
    quotePrefix: "Cita.",
    keywordsPrefix: "Palabras clave.",
  },
  fr: {
    titleLabel: "Titre",
    authorLabel: "Auteur",
    quotePrefix: "Citation.",
    keywordsPrefix: "Mots-clés.",
  },
  de: {
    titleLabel: "Titel",
    authorLabel: "Autor",
    quotePrefix: "Zitat.",
    keywordsPrefix: "Schlagwörter.",
  },
  uk: {
    titleLabel: "Назва",
    authorLabel: "Автор",
    quotePrefix: "Цитата.",
    keywordsPrefix: "Ключові слова.",
  },
};

const DEFAULT: TtsPhrases = PHRASES.en;

export function ttsPhrasesForLanguage(languageCode: string): TtsPhrases {
  const c = languageCode.trim().toLowerCase();
  return PHRASES[c] ?? DEFAULT;
}
