import { useColorScheme } from "react-native";

export const ReadupColors = {
  brand: "#059669",
  brandDark: "#047857",
  background: "#FBFAF2",
  surface: "#F2F0E6",
  elevated: "#E8E6D8",
  text: "#1A2420",
  textSecondary: "#4A5550",
  textTertiary: "#7A7868",
  textInverse: "#FBFAF2",
  border: "#C8C6B2",
  white: "#FFFFFF",
  /** Focus rings and inline links (Figma “Info”) */
  info: "#2563EB",
} as const;

export const ReadupDarkColors = {
  brand: "#34D399",
  brandDark: "#10B981",
  background: "#101512",
  surface: "#19211D",
  elevated: "#26302B",
  text: "#F3F4EE",
  textSecondary: "#B8C1BB",
  textTertiary: "#8F9A93",
  textInverse: "#101512",
  border: "#3A4740",
  white: "#FFFFFF",
  info: "#60A5FA",
} as const satisfies Record<keyof typeof ReadupColors, string>;

export function useReadupColors() {
  return useColorScheme() === "dark" ? ReadupDarkColors : ReadupColors;
}

export const ReadupRadii = {
  chip: 999,
  button: 100,
  card: 20,
  book: 10,
  input: 30,
} as const;
