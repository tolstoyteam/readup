import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generationJobLeaseRetryAfterMs } from "./job-lease";

describe("generationJobLeaseRetryAfterMs", () => {
  it("returns the remaining duration for an active lease", () => {
    assert.equal(
      generationJobLeaseRetryAfterMs(
        { token: "lease", expires_at: "2026-07-28T00:00:10.000Z" },
        Date.parse("2026-07-28T00:00:00.000Z"),
      ),
      10_000,
    );
  });

  it("treats expired and malformed leases as claimable", () => {
    const now = Date.parse("2026-07-28T00:00:10.000Z");
    assert.equal(
      generationJobLeaseRetryAfterMs(
        { token: "lease", expires_at: "2026-07-28T00:00:09.000Z" },
        now,
      ),
      null,
    );
    assert.equal(
      generationJobLeaseRetryAfterMs({ token: "lease", expires_at: "invalid" }, now),
      null,
    );
  });
});
