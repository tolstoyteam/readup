import { adminUsersTable } from "@readup/db";
import { db } from "@/db/client";
import { getSupabaseAdmin } from "@/lib/supabase-storage";

export type AdminPanelUser = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  isAdmin: boolean;
};

export async function listAdminPanelUsers(): Promise<AdminPanelUser[]> {
  const supabase = getSupabaseAdmin();
  const [adminRows, usersResult] = await Promise.all([
    db.select({ userId: adminUsersTable.userId }).from(adminUsersTable),
    supabase.auth.admin.listUsers({ page: 1, perPage: 100 }),
  ]);

  if (usersResult.error) {
    throw new Error(`Could not load Supabase users: ${usersResult.error.message}`);
  }

  const adminIds = new Set(adminRows.map((row) => row.userId));
  return usersResult.data.users
    .map((user) => ({
      id: user.id,
      email: user.email ?? "",
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      isAdmin: adminIds.has(user.id),
    }))
    .sort((a, b) => Number(b.isAdmin) - Number(a.isAdmin) || a.email.localeCompare(b.email));
}
