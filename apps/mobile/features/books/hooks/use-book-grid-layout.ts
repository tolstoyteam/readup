import { useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";

import {
  BOOK_GRID_BOTTOM_PADDING,
  BOOK_GRID_COLUMN_GAP,
  BOOK_GRID_HORIZONTAL_PADDING,
  BOOK_GRID_ROW_GAP,
  getBookGridCardWidth,
} from "@/features/books/lib/book-grid-layout";

export const bookGridColumnWrapperStyle = StyleSheet.create({
  row: {
    paddingHorizontal: BOOK_GRID_HORIZONTAL_PADDING,
    gap: BOOK_GRID_COLUMN_GAP,
  },
}).row;

export const bookGridContentContainerStyle = StyleSheet.create({
  content: {
    gap: BOOK_GRID_ROW_GAP,
    paddingBottom: BOOK_GRID_BOTTOM_PADDING,
  },
}).content;

export function useBookGridLayout() {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = useMemo(
    () => getBookGridCardWidth(screenWidth),
    [screenWidth],
  );

  return { cardWidth, screenWidth };
}
