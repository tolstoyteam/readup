import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assignLegacyStableIds,
  legacyBlockStableId,
  legacyChapterStableId,
} from "./legacy-stable-ids";

describe("legacy stable ids", () => {
  it("builds deterministic chapter and block ids", () => {
    assert.equal(legacyChapterStableId("42", 3), "legacy:42:3");
    assert.equal(legacyBlockStableId("42", 3, 1), "legacy:42:3:1");
  });

  it("assigns ids to legacy pages and text elements", () => {
    const pages = assignLegacyStableIds(
      [
        {
          page_number: 1,
          elements: [
            { type: "chapter_name", content: "Intro" },
            { type: "text", content: "Paragraph one." },
          ],
        },
      ],
      "99",
    );

    assert.equal(pages[0]?.chapter_stable_id, "legacy:99:1");
    const text = pages[0]?.elements[1];
    assert.equal(text?.type, "text");
    if (text?.type === "text") {
      assert.equal(text.block_stable_id, "legacy:99:1:1");
    }
  });
});
