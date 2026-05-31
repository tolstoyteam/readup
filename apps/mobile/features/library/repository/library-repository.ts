import type { LibraryProgress, ReadingStatus, UserBookRecord } from "@readup/db";
import { supabase } from "@/shared/lib/supabase";

const LIBRARY_COLUMNS = "user_id, book_id, is_saved, reading_status, progress, updated_at";

function normalizeProgress(value: unknown): LibraryProgress | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const page = typeof record.page === "number" ? record.page : 0;
  const totalPages = typeof record.total_pages === "number" ? record.total_pages : 0;
  const audioPosition =
    typeof record.audio_position_ms === "number" ? record.audio_position_ms : undefined;
  const lastReadAt = typeof record.last_read_at === "string" ? record.last_read_at : undefined;
  return {
    page,
    total_pages: totalPages,
    ...(audioPosition !== undefined ? { audio_position_ms: audioPosition } : {}),
    ...(lastReadAt !== undefined ? { last_read_at: lastReadAt } : {}),
  };
}

function normalizeRow(row: unknown): UserBookRecord | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  if (
    typeof record.book_id !== "string" ||
    typeof record.is_saved !== "boolean" ||
    (record.reading_status !== "not_started" &&
      record.reading_status !== "in_progress" &&
      record.reading_status !== "completed")
  ) {
    return null;
  }

  return {
    bookId: record.book_id,
    isSaved: record.is_saved,
    readingStatus: record.reading_status as ReadingStatus,
    progress: normalizeProgress(record.progress),
    updatedAt: typeof record.updated_at === "string" ? record.updated_at : null,
  };
}

export async function fetchAllLibraryRecords(userId: string): Promise<UserBookRecord[]> {
  const { data, error } = await supabase
    .from("user_library")
    .select(LIBRARY_COLUMNS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeRow).filter((item): item is UserBookRecord => !!item);
}

export async function fetchLibraryRecord(
  userId: string,
  bookId: string,
): Promise<UserBookRecord | null> {
  const { data, error } = await supabase
    .from("user_library")
    .select(LIBRARY_COLUMNS)
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .maybeSingle();

  if (error) throw error;
  return normalizeRow(data);
}

export async function upsertLibraryRecord(args: {
  userId: string;
  bookId: string;
  isSaved: boolean;
  readingStatus: ReadingStatus;
  progress: LibraryProgress | null;
}): Promise<UserBookRecord> {
  const { data, error } = await supabase
    .from("user_library")
    .upsert(
      {
        user_id: args.userId,
        book_id: args.bookId,
        is_saved: args.isSaved,
        reading_status: args.readingStatus,
        progress: args.progress,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,book_id" },
    )
    .select(LIBRARY_COLUMNS)
    .single();

  if (error) throw error;
  const item = normalizeRow(data);
  if (!item) throw new Error("Could not save library record");
  return item;
}

export async function deleteLibraryRecord(userId: string, bookId: string): Promise<void> {
  const { error } = await supabase
    .from("user_library")
    .delete()
    .eq("user_id", userId)
    .eq("book_id", bookId);

  if (error) throw error;
}

export async function recordReadingSession(args: {
  bookId: string;
  page: number;
  totalPages: number;
  minutesDelta?: number;
  audioPositionMs?: number;
}): Promise<UserBookRecord | null> {
  const { data, error } = await supabase.rpc("record_reading_session", {
    p_book_id: args.bookId,
    p_page: args.page,
    p_total_pages: args.totalPages,
    p_minutes_delta: args.minutesDelta ?? 0,
    p_audio_position_ms: args.audioPositionMs ?? null,
  });
  if (error) throw error;
  return normalizeRow(data);
}
