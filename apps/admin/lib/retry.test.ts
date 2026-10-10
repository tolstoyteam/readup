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

  it("treats Drizzle Failed query wrapping ECONNRESET cause as retryable", () => {
    const cause = Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" });
    const drizzleError = Object.assign(
      new Error(
        'Failed query: select "user_id" from "admin_users" where "admin_users"."user_id" = $1 limit $2',
      ),
      { cause },
    );
    assert.equal(isRetryableError(drizzleError), true);
  });

  it("treats connection-reset message text as retryable", () => {
    assert.equal(isRetryableError(new Error("connection reset by peer")), true);
    assert.equal(isRetryableError(new Error("connection terminated unexpectedly")), true);
  });
});
