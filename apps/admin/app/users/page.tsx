import type { Metadata } from "next";
import { AdminShell } from "@/components/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
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

        <section className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last sign in</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{userLabel(user.email)}</div>
                    <div className="font-mono text-xs text-muted-foreground">{user.id}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.lastSignInAt)}</TableCell>
                  <TableCell>
                    <Badge variant={user.isAdmin ? "default" : "secondary"}>
                      {user.isAdmin ? "Admin" : "User"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {user.isAdmin ? (
                      <form action={revokeAdmin}>
                        <input type="hidden" name="userId" value={user.id} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="destructive"
                          disabled={user.id === auth.userId}
                        >
                          Revoke
                        </Button>
                      </form>
                    ) : (
                      <form action={assignAdmin}>
                        <input type="hidden" name="userId" value={user.id} />
                        <Button type="submit" size="sm" variant="outline">
                          Make admin
                        </Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>
    </AdminShell>
  );
}
