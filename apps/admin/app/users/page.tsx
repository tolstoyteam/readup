import type { Metadata } from "next";
import { AdminShell } from "@/components/AdminShell";
import { requireAdminPage } from "@/lib/admin-auth";
import { listAdminPanelUsers } from "@/lib/admin-users-list";
import { UsersTable } from "./UsersTable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Users",
  description: "Manage Readup admin access.",
};

export default async function UsersPage() {
  const auth = await requireAdminPage();
  const users = await listAdminPanelUsers();

  return (
    <AdminShell active="users">
      <div className="flex flex-col gap-5 p-5 sm:p-8 lg:p-10">
        <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[28px] font-bold leading-tight text-foreground">Users</h1>
            <p className="mt-2 text-base text-muted-foreground">
              Manage user roles across the platform.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Signed in as {auth.email ?? auth.userId}
          </p>
        </header>

        <UsersTable users={users} currentUserId={auth.userId} />
      </div>
    </AdminShell>
  );
}
