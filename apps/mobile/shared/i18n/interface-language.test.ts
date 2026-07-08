import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { interfaceLanguageFromLocale } from "./interface-language";

describe("interfaceLanguageFromLocale", () => {
  it("uses supported phone languages", () => {
    assert.equal(interfaceLanguageFromLocale("ru-KZ"), "ru");
    assert.equal(interfaceLanguageFromLocale("en-US"), "en");
    assert.equal(interfaceLanguageFromLocale("es-MX"), "es");
  });

  it("defaults unsupported phone languages to English", () => {
    assert.equal(interfaceLanguageFromLocale("fr-FR"), "en");
    assert.equal(interfaceLanguageFromLocale(undefined), "en");
  });
});
