import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { adminUsersTable } from "@readup/db";
import { db } from "@/db/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AdminAuthResult =
  | { ok: true; userId: string; email: string | null }
  | { ok: false; status: 401 | 403; message: string };

export async function getAdminAuth(): Promise<AdminAuthResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, status: 401, message: "Authentication required" };
  }

  const rows = await db
    .select({ userId: adminUsersTable.userId })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.userId, user.id))
    .limit(1);

  if (rows.length === 0) {
    return { ok: false, status: 403, message: "Admin access required" };
  }

  return { ok: true, userId: user.id, email: user.email ?? null };
}

export async function requireAdminPage() {
  const auth = await getAdminAuth();
  if (auth.ok) return auth;

  if (auth.status === 401) {
    redirect("/login");
  }
  redirect("/login?error=not_admin");
}

export async function requireAdminApi(): Promise<Response | null> {
  const auth = await getAdminAuth();
  if (auth.ok) return null;
  return Response.json({ error: auth.message }, { status: auth.status });
}
