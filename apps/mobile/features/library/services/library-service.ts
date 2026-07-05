import type { UserBookRecord } from "@readup/db/shared";

import {
  dedupeByWorkId,
  filterByReadingStatus,
  filterSaved,
  getContinueBookRecord,
} from "@/features/library/lib/library-semantics";
import * as libraryRepository from "@/features/library/repository/library-repository";

export async function loadLibrary(userId: string): Promise<UserBookRecord[]> {
  const records = await libraryRepository.fetchAllLibraryRecords(userId);
  return dedupeByWorkId(records);
}

export async function saveBook(userId: string, bookId: string): Promise<UserBookRecord> {
  const result = await libraryRepository.toggleWorkSave(bookId, true);
  if (!result) {
    throw new Error("Could not save book");
  }
  return result;
}

export async function unsaveBook(userId: string, bookId: string): Promise<UserBookRecord | null> {
  return libraryRepository.toggleWorkSave(bookId, false);
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
  chapterStableId?: string;
  blockStableId?: string;
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
