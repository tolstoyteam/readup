import type { InterfaceLanguage } from "@/shared/i18n/interface-language";

type LocalizedLabel = {
  ru: string;
  en: string;
};

export type InterestOption = LocalizedLabel & {
  id: string;
};

export type InterestGroup = LocalizedLabel & {
  id: string;
  items: InterestOption[];
};

export type GoalOption = LocalizedLabel & {
  id: string;
};

export const INTEREST_GROUPS: InterestGroup[] = [
  {
    id: "business_career",
    ru: "Бизнес и карьера",
    en: "Business and career",
    items: [
      {
        id: "entrepreneurship",
        ru: "предпринимательство",
        en: "entrepreneurship",
      },
      { id: "startups", ru: "стартапы", en: "startups" },
      { id: "leadership", ru: "лидерство", en: "leadership" },
      { id: "career_growth", ru: "карьерный рост", en: "career growth" },
    ],
  },
  {
    id: "finance_economics",
    ru: "Финансы и экономика",
    en: "Finance and economics",
    items: [
      { id: "investing", ru: "инвестиции", en: "investing" },
      { id: "personal_finance", ru: "личные финансы", en: "personal finance" },
      { id: "economics", ru: "экономика", en: "economics" },
      {
        id: "financial_literacy",
        ru: "финансовая грамотность",
        en: "financial literacy",
      },
    ],
  },
  {
    id: "self_development",
    ru: "Саморазвитие",
    en: "Self-development",
    items: [
      { id: "productivity", ru: "продуктивность", en: "productivity" },
      { id: "psychology", ru: "психология", en: "psychology" },
      { id: "mindset", ru: "мышление", en: "mindset" },
      { id: "habits", ru: "привычки", en: "habits" },
    ],
  },
  {
    id: "science_technology",
    ru: "Наука и технологии",
    en: "Science and technology",
    items: [
      {
        id: "artificial_intelligence",
        ru: "искусственный интеллект",
        en: "artificial intelligence",
      },
      { id: "innovation", ru: "инновации", en: "innovation" },
      {
        id: "history_of_science",
        ru: "история науки",
        en: "history of science",
      },
      { id: "future", ru: "будущее", en: "future" },
    ],
  },
  {
    id: "culture",
    ru: "Культура",
    en: "Culture",
    items: [
      { id: "biographies", ru: "биографии", en: "biographies" },
      { id: "literature", ru: "литература", en: "literature" },
      { id: "society", ru: "общество", en: "society" },
      { id: "history", ru: "история", en: "history" },
    ],
  },
];

export const GOALS: GoalOption[] = [
  {
    id: "read_5_minutes_daily",
    ru: "Читать 5 минут в день",
    en: "Read 5 minutes a day",
  },
  {
    id: "finish_1_book_weekly",
    ru: "Закончить 1 книгу в неделю",
    en: "Finish 1 book a week",
  },
  {
    id: "career_skills",
    ru: "Развивать карьерные навыки",
    en: "Build career skills",
  },
  {
    id: "understand_finance",
    ru: "Больше понимать финансы",
    en: "Understand finance better",
  },
  {
    id: "be_more_productive",
    ru: "Стать продуктивнее",
    en: "Become more productive",
  },
];

const INTEREST_OPTIONS = INTEREST_GROUPS.flatMap((group) => group.items);

const INTEREST_ID_BY_LEGACY_LABEL = new Map(
  INTEREST_OPTIONS.flatMap((item) => [
    [item.id, item.id],
    [item.ru, item.id],
    [item.en, item.id],
  ]),
);

const GOAL_ID_BY_LEGACY_LABEL = new Map(
  GOALS.flatMap((goal) => [
    [goal.id, goal.id],
    [goal.ru, goal.id],
    [goal.en, goal.id],
  ]),
);

export function setupLabel(
  option: LocalizedLabel,
  language: InterfaceLanguage,
): string {
  return option[language];
}

export function normalizeInterestId(value: string): string {
  return INTEREST_ID_BY_LEGACY_LABEL.get(value) ?? value;
}

export function normalizeInterestIds(values: string[]): string[] {
  return [...new Set(values.map(normalizeInterestId))];
}

export function interestLabel(
  value: string,
  language: InterfaceLanguage,
): string {
  const normalized = normalizeInterestId(value);
  const option = INTEREST_OPTIONS.find((item) => item.id === normalized);
  return option ? setupLabel(option, language) : value;
}

export function normalizeGoalId(value: string | null): string | null {
  if (!value) return null;
  return GOAL_ID_BY_LEGACY_LABEL.get(value) ?? value;
}

export function goalLabel(
  value: string | null,
  language: InterfaceLanguage,
): string | null {
  const normalized = normalizeGoalId(value);
  if (!normalized) return null;
  const option = GOALS.find((goal) => goal.id === normalized);
  return option ? setupLabel(option, language) : value;
}
