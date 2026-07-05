import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { BookPage } from "@readup/db/shared";

import { embedKeywordsInLastChapter } from "./embed-book-keywords";

const chapterPage = (
  pageNumber: number,
  title: string,
  extraElements: BookPage["elements"] = [],
): BookPage => ({
  page_number: pageNumber,
  chapter_stable_id: `chapter-${pageNumber}`,
  elements: [
    { type: "chapter_name", content: title },
    { type: "text", content: "Body text." },
    ...extraElements,
  ],
});

describe("embedKeywordsInLastChapter", () => {
  it("returns pages unchanged when there are no keywords", () => {
    const pages = [chapterPage(1, "Chapter 1"), chapterPage(2, "Chapter 2")];
    const result = embedKeywordsInLastChapter(pages);
    assert.deepEqual(result, pages);
  });

  it("appends keywords to the last chapter without adding a page", () => {
    const pages = [chapterPage(1, "Chapter 1"), chapterPage(2, "Chapter 2")];
    const result = embedKeywordsInLastChapter(pages, ["focus", "habits"]);

    assert.equal(result.length, 2);
    const last = result[1];
    assert.equal(last.elements.at(-1)?.type, "keywords");
    if (last.elements.at(-1)?.type === "keywords") {
      assert.deepEqual(last.elements.at(-1)?.content, ["focus", "habits"]);
    }
  });

  it("embeds keywords on a single-chapter book", () => {
    const pages = [chapterPage(1, "Only chapter")];
    const result = embedKeywordsInLastChapter(pages, ["one", "two"]);

    assert.equal(result.length, 1);
    assert.equal(result[0].elements.at(-1)?.type, "keywords");
  });

  it("removes a legacy keywords-only page and merges into the previous chapter", () => {
    const pages: BookPage[] = [
      chapterPage(1, "Chapter 1"),
      chapterPage(2, "Chapter 2"),
      {
        page_number: 3,
        elements: [{ type: "keywords", content: ["legacy", "terms"] }],
      },
    ];

    const result = embedKeywordsInLastChapter(pages);

    assert.equal(result.length, 2);
    const last = result[1];
    assert.equal(last.page_number, 2);
    assert.equal(last.elements.at(-1)?.type, "keywords");
    if (last.elements.at(-1)?.type === "keywords") {
      assert.deepEqual(last.elements.at(-1)?.content, ["legacy", "terms"]);
    }
  });

  it("merges column keywords with legacy page keywords without duplicates", () => {
    const pages: BookPage[] = [
      chapterPage(1, "Chapter 1"),
      {
        page_number: 2,
        elements: [{ type: "keywords", content: ["Focus", "habits"] }],
      },
    ];

    const result = embedKeywordsInLastChapter(pages, ["habits", "growth"]);

    assert.equal(result.length, 1);
    const keywordsEl = result[0].elements.at(-1);
    assert.equal(keywordsEl?.type, "keywords");
    if (keywordsEl?.type === "keywords") {
      assert.deepEqual(keywordsEl.content, ["habits", "growth", "Focus"]);
    }
  });

  it("does not duplicate keywords when the last page already has a keywords block", () => {
    const pages: BookPage[] = [
      chapterPage(1, "Chapter 1", [
        { type: "keywords", content: ["existing"] },
      ]),
    ];

    const result = embedKeywordsInLastChapter(pages, ["new"]);

    assert.deepEqual(result, pages);
  });

  it("returns empty pages unchanged", () => {
    assert.deepEqual(embedKeywordsInLastChapter([], ["kw"]), []);
  });
});
