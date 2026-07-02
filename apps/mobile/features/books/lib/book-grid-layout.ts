export const BOOK_GRID_HORIZONTAL_PADDING = 32;
export const BOOK_GRID_COLUMN_GAP = 20;
export const BOOK_GRID_ROW_GAP = 24;
export const BOOK_GRID_NUM_COLUMNS = 2;
export const BOOK_GRID_BOTTOM_PADDING = 32;

export const BOOK_COVER_ASPECT = 1.44;
export const BOOK_TITLE_LINE_HEIGHT = 18;
export const BOOK_TITLE_MAX_LINES = 2;
export const BOOK_TITLE_MARGIN_TOP = 8;

export function getBookGridCardWidth(screenWidth: number): number {
  const available =
    screenWidth -
    BOOK_GRID_HORIZONTAL_PADDING * 2 -
    BOOK_GRID_COLUMN_GAP * (BOOK_GRID_NUM_COLUMNS - 1);
  return Math.floor(available / BOOK_GRID_NUM_COLUMNS);
}

export function getBookCardCoverHeight(width: number): number {
  return Math.round(width * BOOK_COVER_ASPECT);
}

export function getBookCardTitleBlockHeight(): number {
  return (
    BOOK_TITLE_MARGIN_TOP + BOOK_TITLE_LINE_HEIGHT * BOOK_TITLE_MAX_LINES
  );
}
