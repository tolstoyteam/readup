import { supabase } from "@/shared/lib/supabase";

export type LibraryStatus = "saved" | "in_progress" | "completed";

export type LibraryItem = {
  user_id: string;
  book_id: string;
  status: LibraryStatus;
  progress: Record<string, unknown> | null;
  updated_at: string | null;
};

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
    progress:
      record.progress && typeof record.progress === "object"
        ? (record.progress as Record<string, unknown>)
        : null,
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
  progress: Record<string, unknown> | null = null,
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
