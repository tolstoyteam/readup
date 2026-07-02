import type { ReadingStatus, UserBookRecord, WorkLibraryProgress } from "@readup/db";
import { supabase } from "@/shared/lib/supabase";

import { resolveWorkId } from "@/features/library/lib/resolve-work-id";

const WORK_LIBRARY_COLUMNS =
  "user_id, work_id, last_edition_id, last_edition_book_id, preferred_language, is_saved, reading_status, progress, updated_at";

function normalizeProgress(value: unknown): WorkLibraryProgress | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const page = typeof record.page === "number" ? record.page : 0;
  const totalPages = typeof record.total_pages === "number" ? record.total_pages : 0;
  const audioPosition =
    typeof record.audio_position_ms === "number" ? record.audio_position_ms : undefined;
  const lastReadAt = typeof record.last_read_at === "string" ? record.last_read_at : undefined;
  const chapterStableId =
    typeof record.chapter_stable_id === "string" ? record.chapter_stable_id : undefined;
  const blockStableId =
    typeof record.block_stable_id === "string" ? record.block_stable_id : undefined;
  const editionBookId =
    typeof record.edition_book_id === "string" ? record.edition_book_id : undefined;

  let canonicalPosition: WorkLibraryProgress["canonical_position"];
  if (record.canonical_position && typeof record.canonical_position === "object") {
    const cp = record.canonical_position as Record<string, unknown>;
    canonicalPosition = {
      ...(typeof cp.chapter_stable_id === "string"
        ? { chapter_stable_id: cp.chapter_stable_id }
        : {}),
      ...(typeof cp.block_stable_id === "string" ? { block_stable_id: cp.block_stable_id } : {}),
      ...(typeof cp.page === "number" ? { page: cp.page } : {}),
      ...(typeof cp.total_pages === "number" ? { total_pages: cp.total_pages } : {}),
    };
  }

  return {
    page,
    total_pages: totalPages,
    ...(chapterStableId !== undefined ? { chapter_stable_id: chapterStableId } : {}),
    ...(blockStableId !== undefined ? { block_stable_id: blockStableId } : {}),
    ...(audioPosition !== undefined ? { audio_position_ms: audioPosition } : {}),
    ...(lastReadAt !== undefined ? { last_read_at: lastReadAt } : {}),
    ...(editionBookId !== undefined ? { edition_book_id: editionBookId } : {}),
    ...(canonicalPosition ? { canonical_position: canonicalPosition } : {}),
  };
}

function normalizeWorkRow(row: unknown): UserBookRecord | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;

  const workId =
    typeof record.work_id === "string"
      ? record.work_id
      : typeof record.work_id_text === "string"
        ? record.work_id_text
        : null;

  const lastEditionBookId =
    typeof record.last_edition_book_id === "string"
      ? record.last_edition_book_id
      : typeof record.last_edition_id === "number"
        ? String(record.last_edition_id)
        : null;

  const progress = normalizeProgress(record.progress);
  const bookId = lastEditionBookId ?? progress?.edition_book_id ?? null;

  if (
    !workId ||
    !bookId ||
    typeof record.is_saved !== "boolean" ||
    (record.reading_status !== "not_started" &&
      record.reading_status !== "in_progress" &&
      record.reading_status !== "completed")
  ) {
    return null;
  }

  return {
    workId,
    bookId,
    lastEditionId:
      typeof record.last_edition_id === "number" ? record.last_edition_id : null,
    preferredLanguage:
      typeof record.preferred_language === "string" ? record.preferred_language : null,
    isSaved: record.is_saved,
    readingStatus: record.reading_status as ReadingStatus,
    progress,
    updatedAt: typeof record.updated_at === "string" ? record.updated_at : null,
  };
}

export async function fetchAllLibraryRecords(userId: string): Promise<UserBookRecord[]> {
  const { data, error } = await supabase
    .from("user_work_library_enriched")
    .select(WORK_LIBRARY_COLUMNS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeWorkRow).filter((item): item is UserBookRecord => !!item);
}

export async function fetchLibraryRecordByWorkId(
  userId: string,
  workId: string,
): Promise<UserBookRecord | null> {
  const { data, error } = await supabase
    .from("user_work_library_enriched")
    .select(WORK_LIBRARY_COLUMNS)
    .eq("user_id", userId)
    .eq("work_id", workId)
    .maybeSingle();

  if (error) throw error;
  return normalizeWorkRow(data);
}

export async function fetchLibraryRecord(
  userId: string,
  bookId: string,
): Promise<UserBookRecord | null> {
  const workId = await resolveWorkId(bookId);
  if (!workId) return null;
  return fetchLibraryRecordByWorkId(userId, workId);
}

export async function toggleWorkSave(
  bookId: string,
  saved: boolean,
): Promise<UserBookRecord | null> {
  const { data, error } = await supabase.rpc("toggle_work_save", {
    p_book_id: bookId,
    p_saved: saved,
  });
  if (error) throw error;
  if (!data) return null;
  return normalizeWorkRow(data);
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
  const { data, error } = await supabase.rpc("record_reading_session", {
    p_book_id: args.bookId,
    p_page: args.page,
    p_total_pages: args.totalPages,
    p_minutes_delta: args.minutesDelta ?? 0,
    p_audio_position_ms: args.audioPositionMs ?? null,
    p_chapter_stable_id: args.chapterStableId ?? null,
    p_block_stable_id: args.blockStableId ?? null,
  });
  if (error) throw error;
  return normalizeWorkRow(data);
}
