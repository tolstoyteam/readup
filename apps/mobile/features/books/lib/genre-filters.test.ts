import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BOOK_GENRES, genreRuLabel } from "@readup/db/shared";

import {
  bookGenreDisplayLabel,
  genreOptionFromRaw,
  resolveBookGenre,
} from "./genre-filters";

describe("resolveBookGenre", () => {
  it("resolves every canonical slug", () => {
    for (const genre of BOOK_GENRES) {
      assert.equal(resolveBookGenre(genre), genre);
    }
  });

  it("resolves Russian labels back to slugs", () => {
    for (const genre of BOOK_GENRES) {
      assert.equal(resolveBookGenre(genreRuLabel(genre)), genre);
    }
  });

  it("resolves English and Spanish display labels", () => {
    assert.equal(resolveBookGenre("Business"), "business");
    assert.equal(resolveBookGenre("Self-improvement"), "self_improvement");
    assert.equal(resolveBookGenre("Negocios"), "business");
    assert.equal(resolveBookGenre("Desarrollo personal"), "self_improvement");
  });

  it("returns null for unknown values", () => {
    assert.equal(resolveBookGenre(""), null);
    assert.equal(resolveBookGenre("not-a-genre"), null);
  });
});

describe("genreOptionFromRaw", () => {
  it("builds slug + Russian label for known genres", () => {
    assert.deepEqual(genreOptionFromRaw("business"), {
      slug: "business",
      labelRu: "Бизнес",
    });
    assert.deepEqual(genreOptionFromRaw("Бизнес"), {
      slug: "business",
      labelRu: "Бизнес",
    });
  });

  it("preserves unknown strings", () => {
    assert.deepEqual(genreOptionFromRaw("Custom Genre"), {
      slug: "custom genre",
      labelRu: "Custom Genre",
    });
  });
});

describe("bookGenreDisplayLabel", () => {
  it("localizes business from slug for EN and RU", () => {
    assert.equal(bookGenreDisplayLabel("business", "en"), "Business");
    assert.equal(bookGenreDisplayLabel("business", "ru"), "Бизнес");
    assert.equal(bookGenreDisplayLabel("business", "es"), "Negocios");
  });

  it("localizes business from a Russian label for EN and RU", () => {
    assert.equal(bookGenreDisplayLabel("Бизнес", "en"), "Business");
    assert.equal(bookGenreDisplayLabel("Бизнес", "ru"), "Бизнес");
  });

  it("localizes every supported genre for EN and RU", () => {
    for (const genre of BOOK_GENRES) {
      const enFromSlug = bookGenreDisplayLabel(genre, "en");
      const ruFromSlug = bookGenreDisplayLabel(genre, "ru");
      const enFromRu = bookGenreDisplayLabel(genreRuLabel(genre), "en");
      const ruFromRu = bookGenreDisplayLabel(genreRuLabel(genre), "ru");

      assert.ok(enFromSlug.length > 0);
      assert.equal(ruFromSlug, genreRuLabel(genre));
      assert.equal(enFromSlug, enFromRu);
      assert.equal(ruFromSlug, ruFromRu);
      assert.notEqual(enFromSlug, ruFromSlug);
    }
  });

  it("returns unknown strings unchanged", () => {
    assert.equal(bookGenreDisplayLabel("Custom Genre", "ru"), "Custom Genre");
    assert.equal(bookGenreDisplayLabel("Custom Genre", "en"), "Custom Genre");
    assert.equal(bookGenreDisplayLabel("Custom Genre", "es"), "Custom Genre");
  });
});
