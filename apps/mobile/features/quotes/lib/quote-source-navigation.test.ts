import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isQuoteSourceNavigation,
  parseFocusQuoteIdParam,
  quoteEditionMatchesDocument,
  quoteSourceReaderPath,
  shouldSuppressEditionRedirect,
} from "./quote-source-navigation";

describe("parseFocusQuoteIdParam", () => {
  it("returns undefined for empty input", () => {
    assert.equal(parseFocusQuoteIdParam(undefined), undefined);
    assert.equal(parseFocusQuoteIdParam(""), undefined);
    assert.equal(parseFocusQuoteIdParam([]), undefined);
  });

  it("decodes a string param", () => {
    assert.equal(parseFocusQuoteIdParam("quote-1"), "quote-1");
    assert.equal(parseFocusQuoteIdParam("quote%201"), "quote 1");
  });

  it("uses the first value from an array param", () => {
    assert.equal(parseFocusQuoteIdParam(["quote-1", "quote-2"]), "quote-1");
  });
});

describe("isQuoteSourceNavigation", () => {
  it("is active when focusQuoteId is present", () => {
    assert.equal(
      isQuoteSourceNavigation({ quoteSourceSession: false, focusQuoteId: "q1" }),
      true,
    );
  });

  it("is active when quote source session ref is set", () => {
    assert.equal(
      isQuoteSourceNavigation({ quoteSourceSession: true }),
      true,
    );
  });

  it("is inactive for normal reader opens", () => {
    assert.equal(
      isQuoteSourceNavigation({ quoteSourceSession: false }),
      false,
    );
  });

  it("suppresses edition redirect after URL cleanup when session ref persists", () => {
    assert.equal(
      shouldSuppressEditionRedirect({
        quoteSourceSession: true,
        focusQuoteId: undefined,
      }),
      true,
    );
  });
});

describe("shouldSuppressEditionRedirect", () => {
  it("suppresses when a quote source session is active", () => {
    assert.equal(
      shouldSuppressEditionRedirect({ quoteSourceSession: true }),
      true,
    );
  });

  it("suppresses when focusQuoteId is present", () => {
    assert.equal(
      shouldSuppressEditionRedirect({ quoteSourceSession: false, focusQuoteId: "q1" }),
      true,
    );
  });

  it("does not suppress for normal reader opens", () => {
    assert.equal(
      shouldSuppressEditionRedirect({ quoteSourceSession: false }),
      false,
    );
  });
});

describe("quoteSourceReaderPath", () => {
  it("uses the quote edition book id and focus param", () => {
    assert.equal(
      quoteSourceReaderPath({ id: "quote-1", editionBookId: 42 }),
      "/reader/42?focusQuoteId=quote-1",
    );
  });
});

describe("quoteEditionMatchesDocument", () => {
  it("returns true when edition ids match", () => {
    assert.equal(
      quoteEditionMatchesDocument({ editionBookId: 42 }, "42"),
      true,
    );
  });

  it("returns false when edition ids differ", () => {
    assert.equal(
      quoteEditionMatchesDocument({ editionBookId: 42 }, "99"),
      false,
    );
  });
});
