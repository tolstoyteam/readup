const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_MS = 1000;
const DEFAULT_MAX_MS = 30_000;

const DB_RETRY_MAX_ATTEMPTS = 3;
const DB_RETRY_BASE_MS = 200;
const DB_RETRY_MAX_MS = 2_000;

const RETRYABLE_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Flatten an error and its nested `cause` chain (Drizzle wraps network codes). */
function errorChain(error: unknown): unknown[] {
  const out: unknown[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current != null && !seen.has(current)) {
    seen.add(current);
    out.push(current);
    if (typeof current !== "object" || !("cause" in current)) break;
    current = (current as { cause?: unknown }).cause;
  }
  return out;
}

function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: number }).status;
  if (typeof status === "number") return status;
  const response = (error as { response?: { status?: number } }).response;
  if (response && typeof response.status === "number") return response.status;
  return undefined;
}

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const code = (error as { code?: string }).code;
  return typeof code === "string" ? code : undefined;
}

function messageLooksTransient(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("rate limit") ||
    lower.includes("timeout") ||
    lower.includes("temporarily") ||
    lower.includes("econnreset") ||
    lower.includes("connection reset") ||
    lower.includes("connection terminated") ||
    lower.includes("connection refused")
  );
}

/** Whether an error is worth retrying (rate limits, transient server/network faults). */
export function isRetryableError(error: unknown): boolean {
  for (const item of errorChain(error)) {
    const status = errorStatus(item);
    if (status === 429 || status === 408 || status === 502 || status === 503 || status === 504) {
      return true;
    }

    const code = errorCode(item);
    if (code && RETRYABLE_CODES.has(code)) {
      return true;
    }

    if (item instanceof Error) {
      if (messageLooksTransient(item.message)) return true;
    } else if (typeof item === "object" && item !== null && "message" in item) {
      const msg = (item as { message?: unknown }).message;
      if (typeof msg === "string" && messageLooksTransient(msg)) return true;
    }
  }

  return false;
}

export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  label?: string;
  onRetry?: (args: { attempt: number; maxAttempts: number; error: unknown; delayMs: number }) => void;
};

/**
 * Runs `fn` with exponential backoff. Only retries when `isRetryableError` is true.
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_MS;
  const label = options.label ?? "operation";

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable = isRetryableError(error);
      if (!retryable || attempt >= maxAttempts) {
        throw error;
      }
      const delayMs = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      options.onRetry?.({ attempt, maxAttempts, error, delayMs });
      console.warn(
        `[retry] ${label} attempt ${attempt}/${maxAttempts} failed; retrying in ${delayMs}ms`,
        error instanceof Error ? error.message : error,
      );
      await sleep(delayMs);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${label} failed after ${maxAttempts} attempts`);
}

/** Short-backoff retry for transient Postgres / pooler / VPN connection drops. */
export async function withDbRetry<T>(fn: () => Promise<T>, label = "db"): Promise<T> {
  return withExponentialBackoff(fn, {
    maxAttempts: DB_RETRY_MAX_ATTEMPTS,
    baseDelayMs: DB_RETRY_BASE_MS,
    maxDelayMs: DB_RETRY_MAX_MS,
    label,
  });
}
