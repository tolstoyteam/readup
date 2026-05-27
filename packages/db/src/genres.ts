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

export const BOOK_GENRE_RU_LABELS: Record<BookGenre, string> = {
  fiction: "Художественная литература",
  literary_fiction: "Литературная проза",
  science_fiction: "Научная фантастика",
  fantasy: "Фэнтези",
  mystery_thriller: "Детектив и триллер",
  history: "История",
  biography_memoir: "Биографии и мемуары",
  science: "Наука",
  technology: "Технологии",
  business: "Бизнес",
  finance: "Финансы",
  economics: "Экономика",
  psychology: "Психология",
  philosophy: "Философия",
  self_improvement: "Саморазвитие",
  health_wellness: "Здоровье и благополучие",
  arts_culture: "Искусство и культура",
  education: "Образование",
  religion_spirituality: "Религия и духовность",
  politics_current_affairs: "Политика и общество",
  other: "Другое",
};

export function genreRuLabel(id: BookGenre): string {
  return BOOK_GENRE_RU_LABELS[id];
}

export function isBookGenre(value: string): value is BookGenre {
  return (BOOK_GENRES as readonly string[]).includes(value);
}

