import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeTextForTts } from "./book-tts-sanitize";
import { chunkTextForTts, TTS_INPUT_MAX_CHARS } from "./book-tts-text";

describe("sanitizeTextForTts", () => {
  it("normalizes smart quotes and removes emoji", () => {
    const input = "Привет 👋 «мир» — тест…";
    const out = sanitizeTextForTts(input);
    assert.ok(!out.includes("👋"));
    assert.ok(out.includes("мир"));
    assert.ok(out.includes("..."));
  });
});

describe("chunkTextForTts", () => {
  it("splits Russian text on sentence boundaries", () => {
    const sentence = "Это предложение с вопросом? Ещё одно! И третье.";
    const text = Array.from({ length: 40 }, () => sentence).join(" ");
    const chunks = chunkTextForTts(text, 400);
    assert.ok(chunks.length > 1);
    for (const chunk of chunks) {
      assert.ok(chunk.length <= 400);
    }
  });

  it("respects max char limit", () => {
    const text = "А".repeat(TTS_INPUT_MAX_CHARS + 500);
    const chunks = chunkTextForTts(text, TTS_INPUT_MAX_CHARS);
    assert.ok(chunks.every((c) => c.length <= TTS_INPUT_MAX_CHARS));
    assert.equal(chunks.join("").length, text.length);
  });
});
