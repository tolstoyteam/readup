"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import type { AdminPanelUser } from "@/lib/admin-users-list";
import { assignAdmin, revokeAdmin } from "@/app/admin-users/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RoleFilter = "all" | "admin" | "user";

type UsersTableProps = {
  users: AdminPanelUser[];
  currentUserId: string;
};

const FILTERS: Array<{ value: RoleFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "user", label: "Users" },
  { value: "admin", label: "Admins" },
];

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function userLabel(email: string): string {
  if (!email) return "No email";
  const name = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (!name) return email;
  return name.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RoleFilter>("all");

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) => {
      const roleMatches =
        filter === "all" || (filter === "admin" ? user.isAdmin : !user.isAdmin);
      const queryMatches =
        normalizedQuery.length === 0 ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        user.id.toLowerCase().includes(normalizedQuery);

      return roleMatches && queryMatches;
    });
  }, [filter, query, users]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by email..."
            className="pl-12"
          />
        </div>
        <div className="inline-flex h-11 rounded-input border border-border bg-background p-1">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className="min-w-20 rounded-[10px] px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
              data-active={filter === item.value}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <section className="overflow-hidden rounded-card border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last sign in</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-muted-foreground">
                  No users match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-semibold text-foreground">
                    {userLabel(user.email)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={user.isAdmin ? "default" : "secondary"}>
                      {user.isAdmin ? "Admin" : "User"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.lastSignInAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      {user.isAdmin ? (
                        <form action={revokeAdmin}>
                          <input type="hidden" name="userId" value={user.id} />
                          <Button
                            type="submit"
                            size="sm"
                            variant="destructive"
                            disabled={user.id === currentUserId}
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
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
