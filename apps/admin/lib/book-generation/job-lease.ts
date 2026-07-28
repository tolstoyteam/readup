import type { GenerationJobLease } from "./types";

export function generationJobLeaseRetryAfterMs(
  lease: GenerationJobLease | null | undefined,
  nowMs: number = Date.now(),
): number | null {
  if (!lease?.token || !lease.expires_at) return null;
  const expiresAt = Date.parse(lease.expires_at);
  if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) return null;
  return Math.max(500, expiresAt - nowMs);
}
