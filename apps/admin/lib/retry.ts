const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_MS = 1000;
const DEFAULT_MAX_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

/** Whether an error is worth retrying (rate limits, transient server/network faults). */
export function isRetryableError(error: unknown): boolean {
  const status = errorStatus(error);
  if (status === 429 || status === 408 || status === 502 || status === 503 || status === 504) {
    return true;
  }

  const code = errorCode(error);
  if (
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EAI_AGAIN" ||
    code === "UND_ERR_CONNECT_TIMEOUT"
  ) {
    return true;
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("rate limit") || msg.includes("timeout") || msg.includes("temporarily")) {
      return true;
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
