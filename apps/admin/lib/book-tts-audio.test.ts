import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fullTtsChunkIndexes, mergeBookTtsPart } from "./book-tts-audio";

describe("fullTtsChunkIndexes", () => {
  it("requires all three voices per chunk", () => {
    const partial = mergeBookTtsPart(undefined, 0, {
      alloy: "editions/1/tts/part-000-alloy.mp3",
      nova: "editions/1/tts/part-000-nova.mp3",
      ash: "",
    });
    assert.deepEqual(fullTtsChunkIndexes(partial), []);

    const complete = mergeBookTtsPart(undefined, 0, {
      alloy: "editions/1/tts/part-000-alloy.mp3",
      nova: "editions/1/tts/part-000-nova.mp3",
      ash: "editions/1/tts/part-000-ash.mp3",
    });
    assert.deepEqual(fullTtsChunkIndexes(complete), [0]);
  });
});
