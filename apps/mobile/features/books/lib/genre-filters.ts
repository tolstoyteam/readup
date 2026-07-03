import {
  BOOK_GENRES,
  genreRuLabel,
  isBookGenre,
  type BookGenre,
} from "@readup/db";
import type { InterfaceLanguage } from "@/shared/i18n/interface-language";

export type GenreOption = {
  slug: string;
  labelRu: string;
};

export type BookWithGenres = {
  bookId: string;
  genres: string[];
};

const BOOK_GENRE_ES_LABELS: Record<BookGenre, string> = {
  fiction: "Ficción",
  literary_fiction: "Ficción literaria",
  science_fiction: "Ciencia ficción",
  fantasy: "Fantasía",
  mystery_thriller: "Misterio y thriller",
  history: "Historia",
  biography_memoir: "Biografías y memorias",
  science: "Ciencia",
  technology: "Tecnología",
  business: "Negocios",
  finance: "Finanzas",
  economics: "Economía",
  psychology: "Psicología",
  philosophy: "Filosofía",
  self_improvement: "Desarrollo personal",
  health_wellness: "Salud y bienestar",
  arts_culture: "Arte y cultura",
  education: "Educación",
  religion_spirituality: "Religión y espiritualidad",
  politics_current_affairs: "Política y actualidad",
  other: "Otro",
};

export function normalizeGenreKey(value: string): string {
  return value.trim().toLowerCase();
}

/** Stable keys for matching a book's genre strings against catalog options. */
export function bookGenreKeys(book: BookWithGenres): Set<string> {
  const keys = new Set<string>();
  for (const raw of book.genres) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    keys.add(normalizeGenreKey(trimmed));
    if (isBookGenre(trimmed)) {
      keys.add(normalizeGenreKey(genreRuLabel(trimmed)));
      keys.add(normalizeGenreKey(trimmed));
    }
  }
  return keys;
}

function genreOptionKeys(genre: GenreOption): Set<string> {
  const keys = new Set<string>();
  keys.add(normalizeGenreKey(genre.slug));
  keys.add(normalizeGenreKey(genre.labelRu));
  if (isBookGenre(genre.slug)) {
    keys.add(normalizeGenreKey(genreRuLabel(genre.slug)));
  }
  return keys;
}

export function bookMatchesGenre(
  book: BookWithGenres,
  genre: GenreOption,
): boolean {
  const bookKeys = bookGenreKeys(book);
  for (const key of genreOptionKeys(genre)) {
    if (bookKeys.has(key)) return true;
  }
  return false;
}

export function bookMatchesGenres(
  book: BookWithGenres,
  selected: GenreOption[],
  mode: "and" | "or",
): boolean {
  if (selected.length === 0) return true;
  if (mode === "or") {
    return selected.some((genre) => bookMatchesGenre(book, genre));
  }
  return selected.every((genre) => bookMatchesGenre(book, genre));
}

export function sortGenresByLabel(genres: GenreOption[]): GenreOption[] {
  return [...genres].sort((a, b) => a.labelRu.localeCompare(b.labelRu, "ru"));
}

function bookGenreFromOption(genre: GenreOption): BookGenre | null {
  if (isBookGenre(genre.slug)) return genre.slug;
  return (
    BOOK_GENRES.find((bookGenre) => genreRuLabel(bookGenre) === genre.labelRu) ??
    null
  );
}

export function genreDisplayLabel(
  genre: GenreOption,
  language: InterfaceLanguage,
): string {
  if (language === "ru") return genre.labelRu;
  if (language === "es") {
    const bookGenre = bookGenreFromOption(genre);
    return bookGenre ? BOOK_GENRE_ES_LABELS[bookGenre] : genre.slug;
  }
  return genre.slug;
}

export function sortGenresForLanguage(
  genres: GenreOption[],
  language: InterfaceLanguage,
): GenreOption[] {
  return [...genres].sort((a, b) =>
    genreDisplayLabel(a, language).localeCompare(
      genreDisplayLabel(b, language),
      language,
    ),
  );
}

export type GenreFeedSection<T extends BookWithGenres> = {
  title: string;
  genre: GenreOption;
  data: T[];
};

export function buildGenreFeedSections<T extends BookWithGenres>(
  books: T[],
  genres: GenreOption[],
  language: InterfaceLanguage = "ru",
): GenreFeedSection<T>[] {
  const sorted = sortGenresForLanguage(genres, language);
  const sections: GenreFeedSection<T>[] = [];

  for (const genre of sorted) {
    const seen = new Set<string>();
    const data: T[] = [];
    for (const book of books) {
      if (!bookMatchesGenre(book, genre)) continue;
      if (seen.has(book.bookId)) continue;
      seen.add(book.bookId);
      data.push(book);
    }
    if (data.length > 0) {
      sections.push({ title: genreDisplayLabel(genre, language), genre, data });
    }
  }

  return sections;
}

/** Infer genre options from loaded books when DB fetch fails. */
export function genresFromBooks(books: BookWithGenres[]): GenreOption[] {
  const byKey = new Map<string, GenreOption>();
  for (const book of books) {
    for (const raw of book.genres) {
      const label = raw.trim();
      if (!label) continue;
      const slug = isBookGenre(label) ? label : normalizeGenreKey(label);
      const labelRu = isBookGenre(label) ? genreRuLabel(label) : label;
      const key = normalizeGenreKey(slug);
      if (!byKey.has(key)) {
        byKey.set(key, { slug, labelRu });
      }
    }
  }
  return sortGenresByLabel(Array.from(byKey.values()));
}

export function genresBySlugs(
  genres: GenreOption[],
  slugs: string[],
): GenreOption[] {
  const slugSet = new Set(slugs.map(normalizeGenreKey));
  return genres.filter((g) => slugSet.has(normalizeGenreKey(g.slug)));
}
