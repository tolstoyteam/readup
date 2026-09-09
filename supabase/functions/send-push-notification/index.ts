import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type NotificationType =
  | "streak_reminder"
  | "new_content"
  | "quiz_reminder"
  | "achievement"
  | "daily_reading";

type ApnsEnvironment = "sandbox" | "production";

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
  push_token: string;
  apns_environment: ApnsEnvironment;
};

type ApnsErrorResponse = {
  reason?: string;
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

function base64Url(bytes: ArrayBuffer | Uint8Array): string {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function base64UrlJson(value: string): Record<string, unknown> | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function jwtRole(token: string | undefined): string | null {
  const payload = token?.split(".")[1];
  if (!payload) return null;
  const claims = base64UrlJson(payload);
  return typeof claims?.role === "string" ? claims.role : null;
}

function pemToPkcs8(privateKey: string): Uint8Array {
  const normalized = privateKey.replace(/\\n/g, "\n");
  const base64 = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function createApnsJwt(params: {
  teamId: string;
  keyId: string;
  privateKey: string;
}): Promise<string> {
  const header = base64Url(utf8(JSON.stringify({ alg: "ES256", kid: params.keyId })));
  const claims = base64Url(
    utf8(
      JSON.stringify({
        iss: params.teamId,
        iat: Math.floor(Date.now() / 1000),
      }),
    ),
  );
  const signingInput = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(params.privateKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    utf8(signingInput),
  );

  return `${signingInput}.${base64Url(signature)}`;
}

function apnsHost(environment: ApnsEnvironment): string {
  return environment === "sandbox"
    ? "https://api.sandbox.push.apple.com"
    : "https://api.push.apple.com";
}

async function sendApnsNotification(params: {
  jwt: string;
  bundleId: string;
  token: string;
  environment: ApnsEnvironment;
  notification: NotificationRecord;
}): Promise<{ ok: true } | { ok: false; status: number; reason: string }> {
  const response = await fetch(
    `${apnsHost(params.environment)}/3/device/${params.token}`,
    {
      method: "POST",
      headers: {
        authorization: `bearer ${params.jwt}`,
        "apns-topic": params.bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        aps: {
          alert: {
            title: params.notification.title,
            body: params.notification.body,
          },
          sound: "default",
        },
        notificationId: params.notification.id,
        type: params.notification.type,
        payload: params.notification.payload ?? {},
      }),
    },
  );

  if (response.ok) return { ok: true };

  const body = (await response.json().catch(() => null)) as ApnsErrorResponse | null;
  return {
    ok: false,
    status: response.status,
    reason: body?.reason ?? `APNs returned HTTP ${response.status}`,
  };
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
  const bearer = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("send-push-notification is missing Supabase environment variables");
    return json({ error: "Push delivery is temporarily unavailable" }, 503);
  }

  if (jwtRole(bearer) !== "service_role") {
    return json({ error: "Unauthorized" }, 401);
  }

  const apnsKeyId = Deno.env.get("APNS_KEY_ID");
  const apnsTeamId = Deno.env.get("APNS_TEAM_ID");
  const apnsPrivateKey = Deno.env.get("APNS_PRIVATE_KEY");
  const apnsBundleId = Deno.env.get("APNS_BUNDLE_ID") ?? "com.sanat.readup";

  if (!apnsKeyId || !apnsTeamId || !apnsPrivateKey || !apnsBundleId) {
    console.error("send-push-notification is missing APNs credentials");
    return json({ error: "APNs credentials are not configured" }, 503);
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
    .select("id, push_token, apns_environment")
    .eq("user_id", notification.user_id)
    .eq("provider", "apns")
    .eq("platform", "ios")
    .eq("enabled", true);

  if (tokensError) {
    console.error("Failed to load push tokens", tokensError.message);
    return json({ error: "Could not load push tokens" }, 500);
  }

  const pushTokens = ((tokens ?? []) as PushTokenRecord[]).filter(
    (token) => token.push_token.length > 0,
  );
  if (pushTokens.length === 0) {
    return json({ sent: 0, skipped: "no_tokens" }, 200);
  }

  const apnsJwt = await createApnsJwt({
    keyId: apnsKeyId,
    teamId: apnsTeamId,
    privateKey: apnsPrivateKey,
  });

  let sent = 0;
  let disabled = 0;
  const errors: string[] = [];

  await Promise.all(
    pushTokens.map(async (token) => {
      const result = await sendApnsNotification({
        jwt: apnsJwt,
        bundleId: apnsBundleId,
        token: token.push_token,
        environment: token.apns_environment,
        notification,
      });

      if (result.ok) {
        sent += 1;
        return;
      }

      errors.push(`${result.status}: ${result.reason}`);

      if (
        result.status === 410 ||
        result.reason === "BadDeviceToken" ||
        result.reason === "Unregistered"
      ) {
        disabled += 1;
        await adminClient
          .from("user_push_tokens")
          .update({
            enabled: false,
            last_error: result.reason,
            updated_at: new Date().toISOString(),
          })
          .eq("id", token.id);
      }
    }),
  );

  return json({ sent, disabled, errors }, errors.length > 0 ? 207 : 200);
});
