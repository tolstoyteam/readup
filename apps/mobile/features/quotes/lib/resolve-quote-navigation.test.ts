import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveQuotePageIndex } from "./resolve-quote-navigation";

describe("resolveQuotePageIndex", () => {
  const pages = [
    { page_number: 1, chapter_stable_id: "chapter-1", elements: [] },
    { page_number: 2, chapter_stable_id: "chapter-2", elements: [] },
  ];

  it("prefers chapter_stable_id", () => {
    const index = resolveQuotePageIndex(
      {
        chapterStableId: "chapter-2",
        pageNumber: 1,
      },
      pages,
    );
    assert.equal(index, 1);
  });

  it("falls back to page_number", () => {
    const index = resolveQuotePageIndex(
      {
        chapterStableId: "missing",
        pageNumber: 2,
      },
      pages,
    );
    assert.equal(index, 1);
  });
});
