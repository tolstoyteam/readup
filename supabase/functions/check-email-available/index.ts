import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const jsonHeaders = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { headers: jsonHeaders, status });
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("check-email-available is missing required Supabase environment variables");
    return json({ error: "Email check is temporarily unavailable" }, 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const rawEmail =
    body != null && typeof body === "object" && "email" in body
      ? (body as { email?: unknown }).email
      : undefined;

  if (typeof rawEmail !== "string") {
    return json({ error: "Email is required" }, 400);
  }

  const email = rawEmail.trim().toLowerCase();
  if (!looksLikeEmail(email)) {
    return json({ error: "Invalid email" }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await adminClient.rpc("is_email_registered", {
    p_email: email,
  });

  if (error) {
    console.error("is_email_registered failed", error.message);
    return json({ error: "Could not check email availability" }, 500);
  }

  return json({ exists: data === true }, 200);
});
