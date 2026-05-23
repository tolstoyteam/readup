import { supabase } from "@/shared/lib/supabase";

export type LibraryStatus = "saved" | "in_progress" | "completed";

export type LibraryProgress = {
  page: number;
  total_pages: number;
  audio_position_ms?: number;
  last_read_at?: string;
};

export type LibraryItem = {
  user_id: string;
  book_id: string;
  status: LibraryStatus;
  progress: LibraryProgress | null;
  updated_at: string | null;
};

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

const LIBRARY_COLUMNS = "user_id, book_id, status, progress, updated_at";

function normalizeLibraryItem(row: unknown): LibraryItem | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  if (
    typeof record.user_id !== "string" ||
    typeof record.book_id !== "string" ||
    (record.status !== "saved" &&
      record.status !== "in_progress" &&
      record.status !== "completed")
  ) {
    return null;
  }

  return {
    user_id: record.user_id,
    book_id: record.book_id,
    status: record.status,
    progress: normalizeProgress(record.progress),
    updated_at: typeof record.updated_at === "string" ? record.updated_at : null,
  };
}

export async function fetchUserLibrary(
  userId: string,
  status?: LibraryStatus,
): Promise<LibraryItem[]> {
  let query = supabase
    .from("user_library")
    .select(LIBRARY_COLUMNS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(normalizeLibraryItem).filter((item): item is LibraryItem => !!item);
}

export async function setLibraryStatus(
  userId: string,
  bookId: string,
  status: LibraryStatus,
  progress: Partial<LibraryProgress> | null = null,
): Promise<LibraryItem> {
  const { data, error } = await supabase
    .from("user_library")
    .upsert(
      {
        user_id: userId,
        book_id: bookId,
        status,
        progress,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,book_id" },
    )
    .select(LIBRARY_COLUMNS)
    .single();

  if (error) throw error;
  const item = normalizeLibraryItem(data);
  if (!item) throw new Error("Could not save library item");
  return item;
}

export async function fetchLibraryItem(
  userId: string,
  bookId: string,
): Promise<LibraryItem | null> {
  const { data, error } = await supabase
    .from("user_library")
    .select(LIBRARY_COLUMNS)
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .maybeSingle();

  if (error) throw error;
  return normalizeLibraryItem(data);
}

/**
 * Calls the `record_reading_session` SQL RPC which atomically updates
 * `user_library` progress + the daily reading log + streak counters.
 */
export async function recordReadingSession(args: {
  bookId: string;
  page: number;
  totalPages: number;
  minutesDelta?: number;
  audioPositionMs?: number;
}): Promise<LibraryItem | null> {
  const { data, error } = await supabase.rpc("record_reading_session", {
    p_book_id: args.bookId,
    p_page: args.page,
    p_total_pages: args.totalPages,
    p_minutes_delta: args.minutesDelta ?? 0,
    p_audio_position_ms: args.audioPositionMs ?? null,
  });
  if (error) throw error;
  return normalizeLibraryItem(data);
}

export async function removeLibraryItem(
  userId: string,
  bookId: string,
): Promise<void> {
  const { error } = await supabase
    .from("user_library")
    .delete()
    .eq("user_id", userId)
    .eq("book_id", bookId);

  if (error) throw error;
}
