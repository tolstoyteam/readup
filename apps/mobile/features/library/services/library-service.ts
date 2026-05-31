import type { UserBookRecord } from "@readup/db";

import {
  filterByReadingStatus,
  filterSaved,
  getContinueBookRecord,
} from "@/features/library/lib/library-semantics";
import * as libraryRepository from "@/features/library/repository/library-repository";

export async function loadLibrary(userId: string): Promise<UserBookRecord[]> {
  return libraryRepository.fetchAllLibraryRecords(userId);
}

export async function saveBook(userId: string, bookId: string): Promise<UserBookRecord> {
  const existing = await libraryRepository.fetchLibraryRecord(userId, bookId);
  return libraryRepository.upsertLibraryRecord({
    userId,
    bookId,
    isSaved: true,
    readingStatus: existing?.readingStatus ?? "not_started",
    progress: existing?.progress ?? null,
  });
}

export async function unsaveBook(userId: string, bookId: string): Promise<UserBookRecord | null> {
  const existing = await libraryRepository.fetchLibraryRecord(userId, bookId);
  if (!existing) return null;

  if (existing.readingStatus === "not_started") {
    await libraryRepository.deleteLibraryRecord(userId, bookId);
    return null;
  }

  return libraryRepository.upsertLibraryRecord({
    userId,
    bookId,
    isSaved: false,
    readingStatus: existing.readingStatus,
    progress: existing.progress,
  });
}

export async function toggleSave(
  userId: string,
  bookId: string,
  currentlySaved: boolean,
): Promise<UserBookRecord | null> {
  if (currentlySaved) {
    return unsaveBook(userId, bookId);
  }
  return saveBook(userId, bookId);
}

export async function recordReadingSession(args: {
  bookId: string;
  page: number;
  totalPages: number;
  minutesDelta?: number;
  audioPositionMs?: number;
}): Promise<UserBookRecord | null> {
  return libraryRepository.recordReadingSession(args);
}

export function getSavedBooks(records: UserBookRecord[]): UserBookRecord[] {
  return filterSaved(records);
}

export function getInProgressBooks(records: UserBookRecord[]): UserBookRecord[] {
  return filterByReadingStatus(records, "in_progress");
}

export function getCompletedBooks(records: UserBookRecord[]): UserBookRecord[] {
  return filterByReadingStatus(records, "completed");
}

export function getContinueBook(records: UserBookRecord[]): UserBookRecord | null {
  return getContinueBookRecord(records);
}
