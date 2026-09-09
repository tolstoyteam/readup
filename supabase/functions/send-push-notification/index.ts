import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type NotificationType =
  | "streak_reminder"
  | "new_content"
  | "quiz_reminder"
  | "achievement"
  | "daily_reading";

type NotificationRecord = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
};

type PushTokenRecord = {
  id: string;
  expo_push_token: string;
};

type ExpoTicket = {
  status?: string;
  message?: string;
  details?: { error?: string };
};

const jsonHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

const preferenceByType: Record<NotificationType, string> = {
  achievement: "achievements",
  daily_reading: "daily_reminder",
  new_content: "new_content",
  quiz_reminder: "quiz_reminders",
  streak_reminder: "streak_alerts",
};

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { headers: jsonHeaders, status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function extractNotification(body: unknown): NotificationRecord | null {
  const record = isRecord(body) && isRecord(body.record) ? body.record : body;
  if (!isRecord(record)) return null;

  if (
    typeof record.id !== "string" ||
    typeof record.user_id !== "string" ||
    typeof record.type !== "string" ||
    typeof record.title !== "string" ||
    typeof record.body !== "string"
  ) {
    return null;
  }

  return {
    id: record.id,
    user_id: record.user_id,
    type: record.type as NotificationType,
    title: record.title,
    body: record.body,
    payload: isRecord(record.payload) ? record.payload : null,
  };
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function looksLikeExpoPushToken(token: string): boolean {
  return /^(ExponentPushToken|ExpoPushToken)\[.+\]$/.test(token);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: jsonHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const bearer = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("send-push-notification is missing Supabase environment variables");
    return json({ error: "Push delivery is temporarily unavailable" }, 503);
  }

  if (bearer !== serviceRoleKey) {
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const notification = extractNotification(payload);
  if (!notification) {
    return json({ error: "Invalid notification payload" }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("notification_preferences")
    .eq("id", notification.user_id)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to load notification preferences", profileError.message);
    return json({ error: "Could not load notification preferences" }, 500);
  }

  const preferences = isRecord(profile?.notification_preferences)
    ? profile.notification_preferences
    : {};
  const preferenceKey = preferenceByType[notification.type];
  if (preferences[preferenceKey] !== true) {
    return json({ sent: 0, skipped: "disabled_by_preference" }, 200);
  }

  const { data: tokens, error: tokensError } = await adminClient
    .from("user_push_tokens")
    .select("id, expo_push_token")
    .eq("user_id", notification.user_id)
    .eq("enabled", true);

  if (tokensError) {
    console.error("Failed to load push tokens", tokensError.message);
    return json({ error: "Could not load push tokens" }, 500);
  }

  const pushTokens = ((tokens ?? []) as PushTokenRecord[]).filter((token) =>
    looksLikeExpoPushToken(token.expo_push_token),
  );
  if (pushTokens.length === 0) {
    return json({ sent: 0, skipped: "no_tokens" }, 200);
  }

  let sent = 0;
  let disabled = 0;
  const errors: string[] = [];

  for (const batch of chunks(pushTokens, 100)) {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
      },
      body: JSON.stringify(
        batch.map((token) => ({
          to: token.expo_push_token,
          sound: "default",
          title: notification.title,
          body: notification.body,
          data: {
            ...(notification.payload ?? {}),
            notificationId: notification.id,
            type: notification.type,
          },
        })),
      ),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      errors.push(
        isRecord(result) && typeof result.message === "string"
          ? result.message
          : `Expo push send failed with HTTP ${response.status}`,
      );
      continue;
    }

    const tickets = Array.isArray(result?.data)
      ? (result.data as ExpoTicket[])
      : ([result?.data].filter(Boolean) as ExpoTicket[]);
    if (tickets.length === 0) {
      errors.push("Expo push send returned no tickets");
      continue;
    }

    await Promise.all(
      tickets.map(async (ticket, index) => {
        const token = batch[index];
        if (!token) return;

        if (ticket.status === "ok") {
          sent += 1;
          return;
        }

        const message = ticket.message ?? "Expo push send failed";
        errors.push(message);

        if (ticket.details?.error === "DeviceNotRegistered") {
          disabled += 1;
          await adminClient
            .from("user_push_tokens")
            .update({
              enabled: false,
              last_error: message,
              updated_at: new Date().toISOString(),
            })
            .eq("id", token.id);
        }
      }),
    );
  }

  return json({ sent, disabled, errors }, errors.length > 0 ? 207 : 200);
});
