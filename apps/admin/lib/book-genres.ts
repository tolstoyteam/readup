export const BOOK_GENRES = [
  "fiction",
  "literary_fiction",
  "science_fiction",
  "fantasy",
  "mystery_thriller",
  "history",
  "biography_memoir",
  "science",
  "technology",
  "business",
  "finance",
  "economics",
  "psychology",
  "philosophy",
  "self_improvement",
  "health_wellness",
  "arts_culture",
  "education",
  "religion_spirituality",
  "politics_current_affairs",
  "other",
] as const;

export type BookGenre = (typeof BOOK_GENRES)[number];

export function genreDisplayName(id: BookGenre): string {
  return id
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
