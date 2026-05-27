import { genreRuLabel, type BookGenre } from "@readup/db";

export { BOOK_GENRES, type BookGenre, BOOK_GENRE_RU_LABELS, genreRuLabel } from "@readup/db";

/**
 * Back-compat export used throughout the admin UI.
 * The value is now Russian-only while the stored identifier remains the slug.
 */
export function genreDisplayName(id: BookGenre): string {
  return genreRuLabel(id);
}
