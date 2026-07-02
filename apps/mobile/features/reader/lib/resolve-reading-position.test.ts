import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolvePageIndex } from "./resolve-reading-position";

const pages = [
  { page_number: 1, chapter_stable_id: "ch-1" },
  { page_number: 2, chapter_stable_id: "ch-2" },
  { page_number: 3, chapter_stable_id: "ch-3" },
];

describe("resolvePageIndex", () => {
  it("resolves by chapter_stable_id when available", () => {
    assert.equal(
      resolvePageIndex({ page: 1, total_pages: 3, chapter_stable_id: "ch-2" }, pages),
      1,
    );
  });

  it("resolves by saved page number", () => {
    assert.equal(resolvePageIndex({ page: 3, total_pages: 3 }, pages), 2);
  });

  it("clamps saved page from removed keywords page to the last chapter", () => {
    // User had progress on old page 4 (standalone keywords) after 3 chapters.
    const chaptersOnly = pages;
    assert.equal(resolvePageIndex({ page: 4, total_pages: 4 }, chaptersOnly), 2);
  });

  it("returns 0 for empty pages or invalid saved page", () => {
    assert.equal(resolvePageIndex({ page: 2, total_pages: 2 }, []), 0);
    assert.equal(resolvePageIndex({ page: 0, total_pages: 2 }, pages), 0);
  });
});
