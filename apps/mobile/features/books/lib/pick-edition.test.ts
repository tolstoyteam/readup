import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pickEdition, pickEditionBookId } from "./pick-edition";

const editions = [
  { book_id: "1", language: "en" },
  { book_id: "2", language: "ru" },
];

describe("pickEdition", () => {
  it("returns the preferred language when available", () => {
    assert.deepEqual(pickEdition(editions, "en"), editions[0]);
    assert.deepEqual(pickEdition(editions, "ru"), editions[1]);
  });

  it("falls back ru → en → first when preferred is missing", () => {
    const onlyEn = [{ book_id: "10", language: "en" }];
    assert.deepEqual(pickEdition(onlyEn, "de"), onlyEn[0]);

    const onlyFr = [{ book_id: "11", language: "fr" }];
    assert.deepEqual(pickEdition(onlyFr, "de"), onlyFr[0]);
  });

  it("returns undefined for an empty list", () => {
    assert.equal(pickEdition([], "en"), undefined);
  });
});

describe("pickEditionBookId", () => {
  it("returns the preferred edition book_id", () => {
    assert.equal(pickEditionBookId(editions, "ru", "1"), "2");
    assert.equal(pickEditionBookId(editions, "en", "2"), "1");
  });

  it("returns fallback when editions are missing or empty", () => {
    assert.equal(pickEditionBookId(undefined, "en", "99"), "99");
    assert.equal(pickEditionBookId([], "en", "99"), "99");
  });
});
