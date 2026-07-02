import type { ReaderLanguage } from "@/features/reader/settings/reader-settings";

export type EditionRef = {
  book_id: string;
  language: string;
};

/** Pick the best edition from a list using the standard fallback chain. */
export function pickEdition<T extends { language: string }>(
  editions: T[],
  preferredLanguage: string,
): T | undefined {
  if (editions.length === 0) return undefined;
  return (
    editions.find((edition) => edition.language === preferredLanguage) ??
    editions.find((edition) => edition.language === "ru") ??
    editions.find((edition) => edition.language === "en") ??
    editions[0]
  );
}

/** Resolve a book_id for the preferred language, falling back to the current edition. */
export function pickEditionBookId(
  editions: EditionRef[] | undefined,
  preferredLanguage: ReaderLanguage,
  fallbackBookId: string,
): string {
  if (!editions?.length) return fallbackBookId;
  return pickEdition(editions, preferredLanguage)?.book_id ?? fallbackBookId;
}
