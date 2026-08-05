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

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: jsonHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authorization = request.headers.get("Authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!accessToken) {
    return json({ error: "Authentication required" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publicKey =
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");

  if (!supabaseUrl || !publicKey || !serviceRoleKey) {
    console.error("Delete account function is missing required Supabase environment variables");
    return json({ error: "Account deletion is temporarily unavailable" }, 503);
  }

  const userClient = createClient(supabaseUrl, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(accessToken);

  if (userError || !user) {
    return json({ error: "Invalid or expired session" }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: signOutError } = await adminClient.auth.admin.signOut(
    accessToken,
    "global",
  );
  if (signOutError) {
    console.error("Failed to revoke account sessions", signOutError.message);
    return json({ error: "Could not securely delete the account" }, 500);
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("Failed to delete account", deleteError.message);
    return json({ error: "Could not delete the account" }, 500);
  }

  return json({ deleted: true }, 200);
});
