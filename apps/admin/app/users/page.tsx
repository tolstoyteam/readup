import type { Metadata } from "next";
import { AdminShell } from "@/components/AdminShell";
import { assignAdmin, revokeAdmin } from "@/app/admin-users/actions";
import { requireAdminPage } from "@/lib/admin-auth";
import { listAdminPanelUsers } from "@/lib/admin-users-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Users",
  description: "Manage Readup admin access.",
};

function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function userLabel(email: string): string {
  return email.length > 0 ? email : "No email";
}

export default async function UsersPage() {
  const auth = await requireAdminPage();
  const users = await listAdminPanelUsers();

  return (
    <AdminShell active="users">
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Users</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Assign admin access to existing Supabase Auth users.
            </p>
          </div>
          <p className="text-xs font-medium text-text-tertiary">
            Signed in as {auth.email ?? auth.userId}
          </p>
        </header>

        <section className="overflow-hidden rounded-[8px] border border-elevated bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-background text-xs uppercase text-text-tertiary">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Last sign in</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-elevated">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{userLabel(user.email)}</div>
                      <div className="mt-1 font-mono text-[11px] text-text-tertiary">{user.id}</div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(user.lastSignInAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          user.isAdmin
                            ? "rounded-[8px] bg-brand/10 px-2 py-1 text-xs font-semibold text-brand"
                            : "rounded-[8px] bg-background px-2 py-1 text-xs font-semibold text-text-tertiary"
                        }
                      >
                        {user.isAdmin ? "Admin" : "User"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.isAdmin ? (
                        <form action={revokeAdmin}>
                          <input type="hidden" name="userId" value={user.id} />
                          <button
                            type="submit"
                            disabled={user.id === auth.userId}
                            className="inline-flex min-h-9 items-center justify-center rounded-[8px] border border-elevated bg-background px-3 text-xs font-semibold text-text-secondary transition-colors hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            Revoke
                          </button>
                        </form>
                      ) : (
                        <form action={assignAdmin}>
                          <input type="hidden" name="userId" value={user.id} />
                          <button
                            type="submit"
                            className="inline-flex min-h-9 items-center justify-center rounded-[8px] border border-brand/40 bg-brand/10 px-3 text-xs font-semibold text-brand transition-colors hover:bg-brand/15"
                          >
                            Make admin
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
