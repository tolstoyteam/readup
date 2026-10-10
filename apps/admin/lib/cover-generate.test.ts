import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCoverPrompt, sanitizeCoverError } from "./cover-prompt";

describe("buildCoverPrompt", () => {
  it("includes title, author, and truncated subjects", () => {
    const prompt = buildCoverPrompt({
      title: "Pride and Prejudice",
      author: "Jane Austen",
      subjects: ["Romance", "England -- Fiction", "Sisters"],
    });
    assert.match(prompt, /Pride and Prejudice/);
    assert.match(prompt, /Jane Austen/);
    assert.match(prompt, /Romance/);
    assert.match(prompt, /5:8/);
    assert.match(prompt, /public figures/i);
  });

  it("works without subjects", () => {
    const prompt = buildCoverPrompt({ title: "Moby Dick", author: "Herman Melville" });
    assert.match(prompt, /Moby Dick/);
    assert.match(prompt, /Infer genre/);
  });
});

describe("sanitizeCoverError", () => {
  it("redacts API key-like tokens and truncates long messages", () => {
    const long = `Failed with sk-abcdefghijklmnopqrstuvwxyz123456 ${"x".repeat(300)}`;
    const sanitized = sanitizeCoverError(new Error(long));
    assert.doesNotMatch(sanitized, /sk-abcdefghijklmnopqrstuvwxyz123456/);
    assert.match(sanitized, /\[redacted\]/);
    assert.ok(sanitized.length <= 240);
  });

  it("handles non-Error values", () => {
    assert.equal(sanitizeCoverError("boom"), "Cover generation failed.");
  });
});
