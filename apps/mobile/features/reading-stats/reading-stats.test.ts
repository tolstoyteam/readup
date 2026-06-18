import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pageForSessionSave } from "./reading-stats";

describe("pageForSessionSave", () => {
  it("sends totalPages when completing", () => {
    assert.equal(pageForSessionSave(8, 10, true), 10);
  });

  it("caps last-page progress before explicit finish", () => {
    assert.equal(pageForSessionSave(10, 10, false), 9);
    assert.equal(pageForSessionSave(12, 10, false), 9);
  });

  it("handles single-page books", () => {
    assert.equal(pageForSessionSave(1, 1, false), 1);
    assert.equal(pageForSessionSave(1, 1, true), 1);
  });

  it("clamps invalid page labels to at least 1", () => {
    assert.equal(pageForSessionSave(0, 5, false), 1);
    assert.equal(pageForSessionSave(-2, 5, false), 1);
  });
});
