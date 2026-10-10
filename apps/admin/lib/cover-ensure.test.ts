import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ensureAiWorkCoverWithDeps,
  isCoverAttemptInFlight,
  type CoverEnsureDeps,
} from "./cover-ensure-core";

type ParsedCover = {
  buffer: Buffer;
  mime: string;
  extension: string;
};

const sampleCover: ParsedCover = {
  buffer: Buffer.from("png"),
  mime: "image/png",
  extension: "png",
};

function mockDeps(overrides: Partial<CoverEnsureDeps> = {}): CoverEnsureDeps & {
  calls: {
    generate: number;
    upload: number;
    persist: number;
    remove: number;
  };
} {
  const calls = {
    generate: 0,
    upload: 0,
    persist: 0,
    remove: 0,
  };
  return {
    calls,
    getWorkCoverPath: async () => null,
    generate: async () => {
      calls.generate += 1;
      return Buffer.from("raw-image");
    },
    normalize: async () => sampleCover,
    upload: async () => {
      calls.upload += 1;
      return "works/w1/cover.png";
    },
    persist: async () => {
      calls.persist += 1;
    },
    remove: async () => {
      calls.remove += 1;
    },
    ...overrides,
  };
}

describe("isCoverAttemptInFlight", () => {
  it("detects generating and uploading", () => {
    assert.equal(isCoverAttemptInFlight({ status: "generating" }), true);
    assert.equal(isCoverAttemptInFlight({ status: "uploading" }), true);
    assert.equal(isCoverAttemptInFlight({ status: "failed" }), false);
    assert.equal(isCoverAttemptInFlight(null), false);
  });
});

describe("ensureAiWorkCoverWithDeps", () => {
  it("skips generation when a cover already exists", async () => {
    const deps = mockDeps({
      getWorkCoverPath: async () => "works/w1/cover.png",
    });
    const statuses: string[] = [];
    const result = await ensureAiWorkCoverWithDeps(
      {
        workId: "w1",
        title: "Title",
        author: "Author",
        onStatus: async (c) => {
          statuses.push(c.status);
        },
      },
      deps,
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.path, "works/w1/cover.png");
      assert.equal(result.cover.status, "skipped");
    }
    assert.equal(deps.calls.generate, 0);
    assert.equal(deps.calls.upload, 0);
    assert.deepEqual(statuses, ["skipped"]);
  });

  it("generates, uploads, and persists a new cover", async () => {
    const deps = mockDeps();
    const statuses: string[] = [];
    const result = await ensureAiWorkCoverWithDeps(
      {
        workId: "w1",
        title: "Title",
        author: "Author",
        subjects: ["Adventure"],
        onStatus: async (c) => {
          statuses.push(c.status);
        },
      },
      deps,
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.path, "works/w1/cover.png");
      assert.equal(result.cover.status, "completed");
    }
    assert.equal(deps.calls.generate, 1);
    assert.equal(deps.calls.upload, 1);
    assert.equal(deps.calls.persist, 1);
    assert.equal(deps.calls.remove, 0);
    assert.ok(statuses.includes("generating"));
    assert.ok(statuses.includes("uploading"));
    assert.ok(statuses.includes("completed"));
  });

  it("returns failed without throwing when generation fails", async () => {
    const deps = mockDeps({
      generate: async () => {
        throw new Error("rate limited sk-secretkey1234567890");
      },
    });
    const result = await ensureAiWorkCoverWithDeps(
      { workId: "w1", title: "T", author: "A" },
      deps,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.cover.status, "failed");
      assert.equal(result.cover.stage, "generate");
      assert.doesNotMatch(result.cover.error ?? "", /sk-secretkey/);
    }
    assert.equal(deps.calls.upload, 0);
    assert.equal(deps.calls.persist, 0);
  });

  it("cleans up storage when DB persist fails after upload", async () => {
    const deps = mockDeps({
      persist: async () => {
        throw new Error("db write failed");
      },
    });
    const result = await ensureAiWorkCoverWithDeps(
      { workId: "w1", title: "T", author: "A" },
      deps,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.cover.status, "failed");
      assert.equal(result.cover.stage, "persist");
    }
    assert.equal(deps.calls.upload, 1);
    assert.equal(deps.calls.remove, 1);
  });

  it("marks upload failures without removing a non-uploaded file", async () => {
    const deps = mockDeps({
      upload: async () => {
        throw new Error("Failed to upload cover to storage.");
      },
    });
    const result = await ensureAiWorkCoverWithDeps(
      { workId: "w1", title: "T", author: "A" },
      deps,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.cover.stage, "upload");
    }
    assert.equal(deps.calls.remove, 0);
    assert.equal(deps.calls.persist, 0);
  });

  it("is safe under concurrent ensure calls when cover already appears mid-flight", async () => {
    let coverPath: string | null = null;
    const deps = mockDeps({
      getWorkCoverPath: async () => coverPath,
      upload: async () => {
        coverPath = "works/w1/cover.png";
        return coverPath;
      },
    });

    const [a, b] = await Promise.all([
      ensureAiWorkCoverWithDeps({ workId: "w1", title: "T", author: "A" }, deps),
      ensureAiWorkCoverWithDeps({ workId: "w1", title: "T", author: "A" }, deps),
    ]);

    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    assert.ok(deps.calls.generate >= 1);
    assert.ok(deps.calls.generate <= 2);
  });
});
