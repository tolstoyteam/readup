import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pageIndexFromSavedPage } from "./page-index";

const pages = [
  { page_number: 1, elements: [] },
  { page_number: 5, elements: [] },
  { page_number: 10, elements: [] },
];

describe("pageIndexFromSavedPage", () => {
  it("maps by page_number when present", () => {
    assert.equal(pageIndexFromSavedPage(5, pages), 1);
    assert.equal(pageIndexFromSavedPage(10, pages), 2);
  });

  it("falls back to savedPage - 1 for contiguous legacy data", () => {
    const contiguous = [
      { page_number: 1, elements: [] },
      { page_number: 2, elements: [] },
      { page_number: 3, elements: [] },
    ];
    assert.equal(pageIndexFromSavedPage(2, contiguous), 1);
  });

  it("returns 0 for empty pages or invalid saved page", () => {
    assert.equal(pageIndexFromSavedPage(3, []), 0);
    assert.equal(pageIndexFromSavedPage(0, pages), 0);
  });

  it("clamps out-of-range saved pages", () => {
    assert.equal(pageIndexFromSavedPage(99, pages), 2);
  });
});
