import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fullTtsChunkIndexes,
  mergeBookTtsPart,
  nextMissingTtsChunkIndex,
} from "./book-tts-audio";

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

describe("nextMissingTtsChunkIndex", () => {
  it("returns the first chunk that is not fully recorded", () => {
    const first = mergeBookTtsPart(undefined, 0, {
      alloy: "editions/1/tts/part-000-alloy.mp3",
      nova: "editions/1/tts/part-000-nova.mp3",
      ash: "editions/1/tts/part-000-ash.mp3",
    });

    assert.equal(nextMissingTtsChunkIndex(first, 3), 1);
    assert.equal(nextMissingTtsChunkIndex(first, 1), null);
    assert.equal(nextMissingTtsChunkIndex(undefined, 2), 0);
  });
});
