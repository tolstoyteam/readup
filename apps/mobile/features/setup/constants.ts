import type { InterfaceLanguage } from "@/shared/i18n/interface-language";

type LocalizedLabel = {
  ru: string;
  en: string;
  es: string;
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
    es: "Negocios y carrera",
    items: [
      {
        id: "entrepreneurship",
        ru: "предпринимательство",
        en: "entrepreneurship",
        es: "emprendimiento",
      },
      { id: "startups", ru: "стартапы", en: "startups", es: "startups" },
      { id: "leadership", ru: "лидерство", en: "leadership", es: "liderazgo" },
      {
        id: "career_growth",
        ru: "карьерный рост",
        en: "career growth",
        es: "crecimiento profesional",
      },
    ],
  },
  {
    id: "finance_economics",
    ru: "Финансы и экономика",
    en: "Finance and economics",
    es: "Finanzas y economía",
    items: [
      { id: "investing", ru: "инвестиции", en: "investing", es: "inversiones" },
      {
        id: "personal_finance",
        ru: "личные финансы",
        en: "personal finance",
        es: "finanzas personales",
      },
      { id: "economics", ru: "экономика", en: "economics", es: "economía" },
      {
        id: "financial_literacy",
        ru: "финансовая грамотность",
        en: "financial literacy",
        es: "educación financiera",
      },
    ],
  },
  {
    id: "self_development",
    ru: "Саморазвитие",
    en: "Self-development",
    es: "Desarrollo personal",
    items: [
      {
        id: "productivity",
        ru: "продуктивность",
        en: "productivity",
        es: "productividad",
      },
      { id: "psychology", ru: "психология", en: "psychology", es: "psicología" },
      { id: "mindset", ru: "мышление", en: "mindset", es: "mentalidad" },
      { id: "habits", ru: "привычки", en: "habits", es: "hábitos" },
    ],
  },
  {
    id: "science_technology",
    ru: "Наука и технологии",
    en: "Science and technology",
    es: "Ciencia y tecnología",
    items: [
      {
        id: "artificial_intelligence",
        ru: "искусственный интеллект",
        en: "artificial intelligence",
        es: "inteligencia artificial",
      },
      { id: "innovation", ru: "инновации", en: "innovation", es: "innovación" },
      {
        id: "history_of_science",
        ru: "история науки",
        en: "history of science",
        es: "historia de la ciencia",
      },
      { id: "future", ru: "будущее", en: "future", es: "futuro" },
    ],
  },
  {
    id: "culture",
    ru: "Культура",
    en: "Culture",
    es: "Cultura",
    items: [
      { id: "biographies", ru: "биографии", en: "biographies", es: "biografías" },
      { id: "literature", ru: "литература", en: "literature", es: "literatura" },
      { id: "society", ru: "общество", en: "society", es: "sociedad" },
      { id: "history", ru: "история", en: "history", es: "historia" },
    ],
  },
];

export const GOALS: GoalOption[] = [
  {
    id: "read_5_minutes_daily",
    ru: "Читать 5 минут в день",
    en: "Read 5 minutes a day",
    es: "Leer 5 minutos al día",
  },
  {
    id: "finish_1_book_weekly",
    ru: "Закончить 1 книгу в неделю",
    en: "Finish 1 book a week",
    es: "Terminar 1 libro por semana",
  },
  {
    id: "career_skills",
    ru: "Развивать карьерные навыки",
    en: "Build career skills",
    es: "Desarrollar habilidades profesionales",
  },
  {
    id: "understand_finance",
    ru: "Больше понимать финансы",
    en: "Understand finance better",
    es: "Entender mejor las finanzas",
  },
  {
    id: "be_more_productive",
    ru: "Стать продуктивнее",
    en: "Become more productive",
    es: "Ser más productivo",
  },
];

const INTEREST_OPTIONS = INTEREST_GROUPS.flatMap((group) => group.items);

const INTEREST_ID_BY_LEGACY_LABEL = new Map(
  INTEREST_OPTIONS.flatMap((item) => [
    [item.id, item.id],
    [item.ru, item.id],
    [item.en, item.id],
    [item.es, item.id],
  ]),
);

const GOAL_ID_BY_LEGACY_LABEL = new Map(
  GOALS.flatMap((goal) => [
    [goal.id, goal.id],
    [goal.ru, goal.id],
    [goal.en, goal.id],
    [goal.es, goal.id],
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
