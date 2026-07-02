import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildHighlightSegments } from "./build-highlight-segments";

describe("buildHighlightSegments", () => {
  it("returns plain text when there are no highlights", () => {
    const segments = buildHighlightSegments("Hello world", []);
    assert.equal(segments.length, 1);
    assert.equal(segments[0]?.highlighted, false);
    assert.equal(segments[0]?.text, "Hello world");
  });

  it("splits text around a single highlight", () => {
    const segments = buildHighlightSegments("Hello world", [
      { quoteId: "q1", start: 6, end: 11 },
    ]);
    assert.deepEqual(segments, [
      { text: "Hello ", highlighted: false },
      { text: "world", highlighted: true, quoteId: "q1", emphasize: undefined },
    ]);
  });

  it("merges overlapping highlights", () => {
    const segments = buildHighlightSegments("abcdef", [
      { quoteId: "q1", start: 1, end: 4 },
      { quoteId: "q2", start: 3, end: 5 },
    ]);
    assert.equal(segments.length, 3);
    assert.equal(segments[1]?.highlighted, true);
    assert.equal(segments[1]?.text, "bcde");
  });

  it("merges adjacent highlights into one span", () => {
    const segments = buildHighlightSegments("abcdef", [
      { quoteId: "q1", start: 0, end: 2 },
      { quoteId: "q2", start: 2, end: 4 },
    ]);
    assert.deepEqual(segments, [
      { text: "abcd", highlighted: true, quoteId: "q1", emphasize: undefined },
      { text: "ef", highlighted: false },
    ]);
  });
});
