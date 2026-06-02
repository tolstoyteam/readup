/** UTC calendar date key (YYYY-MM-DD) used for streaks and daily log. */
export function todayActivityDateKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function daysBetweenUtcDates(fromKey: string, toKey: string): number {
  const from = Date.parse(`${fromKey}T00:00:00.000Z`);
  const to = Date.parse(`${toKey}T00:00:00.000Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

export function generateLastNDays(todayKey: string, count: number): string[] {
  const days: string[] = [];
  const today = new Date(`${todayKey}T00:00:00.000Z`);
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}
