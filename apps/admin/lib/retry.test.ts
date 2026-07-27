import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isRetryableError } from "./retry";

describe("isRetryableError", () => {
  it("treats rate limits and 5xx as retryable", () => {
    assert.equal(isRetryableError({ status: 429 }), true);
    assert.equal(isRetryableError({ status: 503 }), true);
    assert.equal(isRetryableError({ status: 400 }), false);
  });

  it("treats network codes as retryable", () => {
    assert.equal(isRetryableError({ code: "ECONNRESET" }), true);
    assert.equal(isRetryableError({ code: "EINVAL" }), false);
  });
});
