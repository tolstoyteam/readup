import type { LibraryProgress, ReadingStatus, UserBookRecord, WorkLibraryProgress } from "@readup/db";

export function dedupeByWorkId(records: UserBookRecord[]): UserBookRecord[] {
  const byWork = new Map<string, UserBookRecord>();
  for (const record of records) {
    const existing = byWork.get(record.workId);
    if (!existing) {
      byWork.set(record.workId, record);
      continue;
    }
    const merged: UserBookRecord = {
      ...existing,
      isSaved: existing.isSaved || record.isSaved,
      readingStatus:
        existing.readingStatus === "completed" || record.readingStatus === "completed"
          ? "completed"
          : existing.readingStatus === "in_progress" || record.readingStatus === "in_progress"
            ? "in_progress"
            : "not_started",
      progress:
        (existing.progress?.page ?? 0) >= (record.progress?.page ?? 0)
          ? existing.progress
          : record.progress,
      updatedAt:
        (existing.updatedAt ?? "") >= (record.updatedAt ?? "")
          ? existing.updatedAt
          : record.updatedAt,
    };
    byWork.set(record.workId, merged);
  }
  return [...byWork.values()];
}

export function progressPercentage(progress: LibraryProgress | WorkLibraryProgress | null): number {
  if (!progress || progress.total_pages <= 0) return 0;
  return Math.min(100, Math.round((progress.page / progress.total_pages) * 100));
}

export function isInProgress(record: UserBookRecord | null | undefined): boolean {
  return record?.readingStatus === "in_progress";
}

export function isCompleted(record: UserBookRecord | null | undefined): boolean {
  return record?.readingStatus === "completed";
}

export function isSaved(record: UserBookRecord | null | undefined): boolean {
  return record?.isSaved === true;
}

export function sortByLastRead(records: UserBookRecord[]): UserBookRecord[] {
  return [...records].sort((a, b) => {
    const lastA = a.progress?.last_read_at ?? a.updatedAt ?? "";
    const lastB = b.progress?.last_read_at ?? b.updatedAt ?? "";
    return lastB.localeCompare(lastA);
  });
}

export function filterSaved(records: UserBookRecord[]): UserBookRecord[] {
  return records.filter((record) => record.isSaved);
}

export function filterByReadingStatus(
  records: UserBookRecord[],
  status: ReadingStatus,
): UserBookRecord[] {
  return records.filter((record) => record.readingStatus === status);
}

export function getContinueBookRecord(records: UserBookRecord[]): UserBookRecord | null {
  return sortByLastRead(filterByReadingStatus(records, "in_progress"))[0] ?? null;
}
