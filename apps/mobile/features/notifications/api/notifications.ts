import { supabase } from "@/shared/lib/supabase";

export type NotificationType =
  | "streak_reminder"
  | "new_content"
  | "quiz_reminder"
  | "achievement"
  | "daily_reading";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

function normalize(row: unknown): AppNotification | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.type !== "string" ||
    typeof record.title !== "string" ||
    typeof record.body !== "string" ||
    typeof record.created_at !== "string"
  ) {
    return null;
  }
  return {
    id: record.id,
    type: record.type as NotificationType,
    title: record.title,
    body: record.body,
    payload:
      record.payload && typeof record.payload === "object"
        ? (record.payload as Record<string, unknown>)
        : null,
    readAt: typeof record.read_at === "string" ? record.read_at : null,
    createdAt: record.created_at,
  };
}

export async function fetchNotifications(
  userId: string,
  limit = 40,
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("user_notifications")
    .select("id, type, title, body, payload, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (__DEV__) console.warn("[fetchNotifications]", error.message);
    return [];
  }
  return (data ?? []).map(normalize).filter((row): row is AppNotification => !!row);
}

export async function markNotificationsRead(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("id", ids);
}
