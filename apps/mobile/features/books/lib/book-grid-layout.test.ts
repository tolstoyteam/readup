import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BOOK_GRID_COLUMN_GAP,
  BOOK_GRID_HORIZONTAL_PADDING,
  BOOK_GRID_NUM_COLUMNS,
  getBookCardCoverHeight,
  getBookCardTitleBlockHeight,
  getBookGridCardWidth,
} from "./book-grid-layout";

describe("getBookGridCardWidth", () => {
  it("fills the row within one pixel on common phone widths", () => {
    for (const screenWidth of [375, 390, 430]) {
      const cardWidth = getBookGridCardWidth(screenWidth);
      const rowWidth =
        BOOK_GRID_HORIZONTAL_PADDING * 2 +
        cardWidth * BOOK_GRID_NUM_COLUMNS +
        BOOK_GRID_COLUMN_GAP * (BOOK_GRID_NUM_COLUMNS - 1);

      assert.ok(rowWidth <= screenWidth);
      assert.ok(screenWidth - rowWidth <= 1);
    }
  });
});

describe("getBookCardCoverHeight", () => {
  it("keeps the existing cover aspect ratio", () => {
    assert.equal(getBookCardCoverHeight(136), 196);
    assert.equal(getBookCardCoverHeight(153), 220);
  });
});

describe("getBookCardTitleBlockHeight", () => {
  it("reserves two title lines plus top spacing", () => {
    assert.equal(getBookCardTitleBlockHeight(), 44);
  });
});
