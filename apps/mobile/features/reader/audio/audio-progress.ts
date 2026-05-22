export function clampProgressFraction(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

export function audioProgressFraction(
  currentTime: number,
  duration: number,
): number {
  if (!duration || !Number.isFinite(duration) || duration <= 0) return 0;
  return clampProgressFraction(currentTime / duration);
}
