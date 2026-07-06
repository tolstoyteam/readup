import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeMinutesDelta,
  consumePendingReadingTime,
  pageForSessionSave,
} from "./reading-stats";

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

describe("computeMinutesDelta", () => {
  it("does not record sessions shorter than 30 seconds", () => {
    assert.equal(computeMinutesDelta(29_999), 0);
  });

  it("records at least one minute after the minimum threshold", () => {
    assert.equal(computeMinutesDelta(30_000), 1);
  });

  it("caps a single flush to 30 minutes", () => {
    assert.equal(computeMinutesDelta(45 * 60_000), 30);
  });
});

describe("consumePendingReadingTime", () => {
  it("keeps sub-threshold time pending instead of dropping it", () => {
    const first = consumePendingReadingTime(0, 20_000);

    assert.equal(first.minutesDelta, 0);
    assert.equal(first.pendingElapsedMs, 20_000);
  });

  it("records accumulated short sessions once they cross the threshold", () => {
    const second = consumePendingReadingTime(20_000, 20_000);

    assert.equal(second.minutesDelta, 1);
    assert.equal(second.pendingElapsedMs, 0);
  });

  it("preserves unrecorded remainder after a rounded minute flush", () => {
    const result = consumePendingReadingTime(0, 89_000);

    assert.equal(result.minutesDelta, 1);
    assert.equal(result.pendingElapsedMs, 29_000);
  });
});
