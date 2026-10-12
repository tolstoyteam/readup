import { createHash } from "node:crypto";
import { BOOK_GENRES, type BookGenre } from "@readup/db";

export const COVER_CLASSIFICATION_VERSION = 1;
export const COVER_PALETTE_VERSION = 1;
export const COVER_SELECTION_VERSION = 1;
export const COVER_RECIPE_VERSION = 1;
export const COVER_PROMPT_VERSION = 2;

export type CoverPalette = {
  id: string;
  version: number;
  genre: BookGenre;
  panel: string;
  imageBackground: string;
  accent: string;
  secondary: string;
};

const colorSets: Record<BookGenre, [string, string, string, string][]> = {
  fiction: [["#F3E9D9", "#D7B99E", "#A54236", "#324A58"], ["#EADFD3", "#B8A99A", "#483B56", "#C77B44"]],
  literary_fiction: [["#F4E8D6", "#D6C4AB", "#9B4C37", "#5D6454"], ["#E8E1D6", "#C6B8A8", "#2F5D62", "#B46E58"]],
  science_fiction: [["#172B3D", "#102337", "#E5A653", "#74B9C5"], ["#DCE8EA", "#A9C5C7", "#E86B55", "#294866"]],
  fantasy: [["#253B35", "#162A29", "#D8AC5E", "#89A993"], ["#E8DAC1", "#BAC0A9", "#643C65", "#9A6A43"]],
  mystery_thriller: [["#22262B", "#343239", "#DB654D", "#B9AAA0"], ["#E0DAD1", "#B4B8B0", "#6B2638", "#344554"]],
  history: [["#E8D9BF", "#C5B595", "#8D523A", "#506052"], ["#DCE4DC", "#A7B8B2", "#705046", "#A17A42"]],
  biography_memoir: [["#EEE4D8", "#CDBCB0", "#8D553F", "#50666E"], ["#DCE5E3", "#AAC5C0", "#C2734C", "#454F63"]],
  science: [["#E1EBE6", "#BCD5CC", "#246B70", "#DA8A54"], ["#192E42", "#1F4652", "#E5B562", "#95C7C5"]],
  technology: [["#162C3B", "#123C4D", "#60D0BE", "#F0AF64"], ["#E3E9E9", "#C0D3D1", "#356482", "#E09C5D"]],
  business: [["#E9E7DF", "#C7C9BC", "#345B5E", "#B88752"], ["#243344", "#425360", "#E0A65B", "#9EB6AE"]],
  finance: [["#193B38", "#315E56", "#D9B364", "#B8D1B8"], ["#EBE7D8", "#C3C9B2", "#3A6B53", "#B47D45"]],
  economics: [["#E6E7DB", "#B7C4B6", "#426A60", "#B77C48"], ["#263945", "#405A60", "#E2BA74", "#9BBEAE"]],
  psychology: [["#EBDDE1", "#C6AEBB", "#704B68", "#BB7D64"], ["#E2E9E5", "#B7CFC8", "#456F70", "#CE8B66"]],
  philosophy: [["#E9E2D5", "#C4B7A5", "#5B4E62", "#A97951"], ["#292C3B", "#484A5E", "#D6B079", "#ADB8BA"]],
  self_improvement: [["#E8EBD9", "#CCD5AD", "#577459", "#D18C57"], ["#EDE3DA", "#D7C0B4", "#AA654C", "#60817C"]],
  health_wellness: [["#E4EEE7", "#B9D8C5", "#3D7869", "#D9A26B"], ["#F0E8DC", "#D7C8AF", "#5D877B", "#C27A62"]],
  arts_culture: [["#F0DFD4", "#D9AFA1", "#A83F4D", "#416472"], ["#252E39", "#3F5661", "#E3A666", "#C4C1AF"]],
  education: [["#E8E7D9", "#C9CBAE", "#47647C", "#D38D57"], ["#DDE9E9", "#A9CDD0", "#355E69", "#CE8258"]],
  religion_spirituality: [["#EDE3D2", "#D8C9AE", "#84644B", "#6B8191"], ["#273948", "#375064", "#D8B178", "#A7C4C1"]],
  politics_current_affairs: [["#E7E4DA", "#C6C6BC", "#A4453D", "#344D5D"], ["#273848", "#344F60", "#D6855D", "#ADB8B1"]],
  other: [["#EAE5DB", "#CBC3B4", "#425E66", "#BB765A"], ["#27343B", "#46555A", "#D8A566", "#A7B9B3"]],
};

export const COVER_PALETTES: CoverPalette[] = BOOK_GENRES.flatMap((genre) =>
  colorSets[genre].map(([panel, imageBackground, accent, secondary], index) => ({
    id: `${genre}-${index + 1}`,
    version: COVER_PALETTE_VERSION,
    genre,
    panel,
    imageBackground,
    accent,
    secondary,
  })),
);

const rules: Array<[BookGenre, RegExp, number]> = [
  ["science_fiction", /science fiction|sci.?fi|space travel|interplanetary|alien|dystopi/i, 30],
  ["biography_memoir", /biograph|autobiograph|memoir|personal narrative|life of|diar(?:y|ies)/i, 30],
  ["mystery_thriller", /detective|mystery|thriller|crime fiction|suspense/i, 26],
  ["fantasy", /fantasy|fairy tales|magic|mythical/i, 26],
  ["literary_fiction", /literary fiction|classic literature/i, 22],
  ["history", /history|historical|ancient civilization/i, 20],
  ["science", /natural history/i, 30],
  ["science", /science|physics|chemistry|biology|astronomy|natural history/i, 20],
  ["technology", /technology|computer|engineering|invention/i, 20],
  ["business", /business|management|entrepreneur/i, 20],
  ["finance", /finance|investing|money|banking/i, 20],
  ["economics", /economics|economic theory/i, 20],
  ["psychology", /psychology|mental process/i, 20],
  ["philosophy", /philosophy|ethics|metaphysics/i, 20],
  ["self_improvement", /self.help|personal growth|self.improvement/i, 20],
  ["health_wellness", /\bhealth\b|medicine|wellness|nutrition/i, 20],
  ["arts_culture", /\barts?\b|music|culture|architecture/i, 20],
  ["education", /education|teaching|pedagogy/i, 20],
  ["religion_spirituality", /religion|spiritual|theology/i, 20],
  ["politics_current_affairs", /politic|government|current affairs/i, 20],
  ["fiction", /fiction|novel|stories|romance|adventure/i, 2],
];
const genrePriority: BookGenre[] = [
  ...BOOK_GENRES.filter((genre) => genre !== "fiction" && genre !== "other"),
  "fiction", "other",
];

export function classifyCoverGenre(args: { genres?: string[]; subjects?: string[]; bookshelves?: string[] }): BookGenre {
  const saved = (args.genres ?? []).filter((genre): genre is BookGenre =>
    (BOOK_GENRES as readonly string[]).includes(genre));
  if (saved.length) return saved.sort((a, b) => genrePriority.indexOf(a) - genrePriority.indexOf(b))[0]!;
  const evidence = [...new Set([...(args.subjects ?? []), ...(args.bookshelves ?? [])]
    .map((phrase) => phrase.trim().toLowerCase()).filter(Boolean))];
  const scores = new Map<BookGenre, number>();
  for (const phrase of evidence) for (const [genre, pattern, score] of rules) {
    if (pattern.test(phrase)) scores.set(genre, (scores.get(genre) ?? 0) + score);
  }
  return [...scores].sort((a, b) => b[1] - a[1] || genrePriority.indexOf(a[0]) - genrePriority.indexOf(b[0]))[0]?.[0] ?? "other";
}

export function selectCoverPalette(identity: string, genre: BookGenre): CoverPalette {
  const choices = COVER_PALETTES.filter((palette) => palette.genre === genre);
  const hash = createHash("sha256").update(`${COVER_SELECTION_VERSION}:${genre}:${identity}`).digest();
  return choices[hash.readUInt32BE(0) % choices.length]!;
}

export type CoverRecipe = {
  version: number;
  title: string;
  author: string;
  genre: BookGenre;
  classificationVersion: number;
  palette: CoverPalette;
  textColorMode: "auto" | "black" | "white";
  resolvedTextColor: string;
  grainSeed: number;
  grainStrength: number;
  focalOffset: number;
  layoutVersion: number;
  fontVersion: number;
  compositorVersion: number;
  promptVersion: number;
  conceptSubjects: string[];
  model: string;
  quality: string;
  size: string;
};

export function textColorForPanel(panel: string, mode: CoverRecipe["textColorMode"]): string {
  if (mode !== "auto") return mode === "black" ? "#101010" : "#FFFFFF";
  const parts = [1, 3, 5].map((i) => parseInt(panel.slice(i, i + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * parts[0]! + 0.7152 * parts[1]! + 0.0722 * parts[2]!;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? "#101010" : "#FFFFFF";
}

export function createCoverRecipe(args: { identity: string; title: string; author: string; genres?: string[]; subjects?: string[]; bookshelves?: string[] }): CoverRecipe {
  const genre = classifyCoverGenre(args);
  const palette = selectCoverPalette(args.identity, genre);
  const seed = createHash("sha256").update(`grain:${args.identity}`).digest().readUInt32BE(0);
  return {
    version: COVER_RECIPE_VERSION, title: args.title, author: args.author, genre,
    classificationVersion: COVER_CLASSIFICATION_VERSION, palette, textColorMode: "auto",
    resolvedTextColor: textColorForPanel(palette.panel, "auto"), grainSeed: seed,
    grainStrength: 0, focalOffset: 0, layoutVersion: 1, fontVersion: 1, compositorVersion: 1,
    promptVersion: COVER_PROMPT_VERSION, model: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2.5-flare",
    conceptSubjects: [...(args.subjects ?? []), ...(args.bookshelves ?? [])].filter(Boolean).slice(0, 6),
    quality: process.env.OPENAI_IMAGE_QUALITY?.trim() || "medium", size: "1024x1024",
  };
}
