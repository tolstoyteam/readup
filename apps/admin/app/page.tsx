import Link from "next/link";
import { count, desc } from "drizzle-orm";
import {
  adminUsersTable,
  booksTable,
  bookWorksTable,
  generationJobsTable,
  profilesTable,
} from "@readup/db";
import { AdminNav } from "@/components/AdminNav";
import { db } from "@/db/client";
import { assignAdmin, revokeAdmin } from "@/app/admin-users/actions";
import { requireAdminPage } from "@/lib/admin-auth";
import { languageLabel } from "@/lib/book-language";
import { listBooks } from "@/lib/book-relational";
import { getSupabaseAdmin } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";

type DashboardUser = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  isAdmin: boolean;
};

async function getScalarCount(table: typeof bookWorksTable | typeof booksTable | typeof profilesTable | typeof adminUsersTable | typeof generationJobsTable) {
  const [row] = await db.select({ value: count() }).from(table);
  return row?.value ?? 0;
}

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

export default async function Home() {
  const auth = await requireAdminPage();
  const supabase = getSupabaseAdmin();

  const [
    worksCount,
    editionsCount,
    profilesCount,
    adminsCount,
    jobsCount,
    adminRows,
    recentJobs,
    recentBooks,
    usersResult,
  ] = await Promise.all([
    getScalarCount(bookWorksTable),
    getScalarCount(booksTable),
    getScalarCount(profilesTable),
    getScalarCount(adminUsersTable),
    getScalarCount(generationJobsTable),
    db.select({ userId: adminUsersTable.userId }).from(adminUsersTable),
    db
      .select({
        id: generationJobsTable.id,
        type: generationJobsTable.type,
        status: generationJobsTable.status,
        updatedAt: generationJobsTable.updatedAt,
      })
      .from(generationJobsTable)
      .orderBy(desc(generationJobsTable.updatedAt))
      .limit(5),
    listBooks().then((books) => books.slice(0, 6)),
    supabase.auth.admin.listUsers({ page: 1, perPage: 100 }),
  ]);

  if (usersResult.error) {
    throw new Error(`Could not load Supabase users: ${usersResult.error.message}`);
  }

  const adminIds = new Set(adminRows.map((row) => row.userId));
  const users: DashboardUser[] = usersResult.data.users
    .map((user) => ({
      id: user.id,
      email: user.email ?? "",
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      isAdmin: adminIds.has(user.id),
    }))
    .sort((a, b) => Number(b.isAdmin) - Number(a.isAdmin) || a.email.localeCompare(b.email));

  return (
    <>
      <AdminNav links={[{ href: "/", label: "Dashboard" }, { href: "/books", label: "Books" }, { href: "/upload", label: "Upload" }]} />

      <main className="min-h-full flex-1 bg-background text-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 border-b border-elevated pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                Readup admin
              </p>
              <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                Dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                Content operations, generation status, and admin access are managed from here.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/upload?generate=1"
                className="inline-flex min-h-10 items-center justify-center rounded-[8px] border-2 border-brand-dark bg-brand px-4 text-sm font-semibold text-text-inverse shadow-sm transition-colors hover:bg-brand-dark"
              >
                Generate
              </Link>
              <Link
                href="/upload"
                className="inline-flex min-h-10 items-center justify-center rounded-[8px] border border-elevated bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:border-brand hover:text-brand"
              >
                New book
              </Link>
            </div>
          </header>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Works", worksCount],
              ["Editions", editionsCount],
              ["Profiles", profilesCount],
              ["Admins", adminsCount],
              ["Jobs", jobsCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[8px] border border-elevated bg-surface px-4 py-3">
                <p className="text-xs font-medium text-text-tertiary">{label}</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
              </div>
            ))}
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-6">
            <section className="rounded-[8px] border border-elevated bg-surface">
              <div className="flex flex-col gap-1 border-b border-elevated px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Recently uploaded books</h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Open an existing edition to update its details, cover, chapters, quiz, or narration.
                  </p>
                </div>
                <Link
                  href="/books"
                  className="text-xs font-semibold text-brand transition-colors hover:text-brand-dark"
                >
                  View all
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead className="bg-background text-xs uppercase text-text-tertiary">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Book</th>
                      <th className="px-4 py-3 font-semibold">Language</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Chapters</th>
                      <th className="px-4 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBooks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="border-t border-elevated px-4 py-5 text-sm text-text-secondary">
                          No books have been uploaded yet.
                        </td>
                      </tr>
                    ) : (
                      recentBooks.map((book) => (
                        <tr key={book.id} className="border-t border-elevated">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{book.title}</div>
                            <div className="mt-1 text-xs text-text-tertiary">{book.author}</div>
                          </td>
                          <td className="px-4 py-3 text-text-secondary">{languageLabel(book.language)}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-[8px] bg-background px-2 py-1 text-xs font-semibold text-text-secondary">
                              {book.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-secondary">{book.chapterCount}</td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/books/${book.id}/edit`}
                              className="inline-flex min-h-9 items-center justify-center rounded-[8px] border border-brand/40 bg-brand/10 px-3 text-xs font-semibold text-brand transition-colors hover:bg-brand/15"
                            >
                              Edit
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-[8px] border border-elevated bg-surface">
              <div className="flex flex-col gap-1 border-b border-elevated px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Users</h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Assign admin access to existing Supabase Auth users.
                  </p>
                </div>
                <span className="text-xs font-medium text-text-tertiary">
                  Signed in as {auth.email ?? auth.userId}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
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
                          <span className={user.isAdmin ? "rounded-[8px] bg-brand/10 px-2 py-1 text-xs font-semibold text-brand" : "rounded-[8px] bg-background px-2 py-1 text-xs font-semibold text-text-tertiary"}>
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

            <aside className="flex flex-col gap-4">
              <section className="rounded-[8px] border border-elevated bg-surface">
                <div className="border-b border-elevated px-4 py-4">
                  <h2 className="text-base font-semibold text-foreground">Recent jobs</h2>
                </div>
                <div className="divide-y divide-elevated">
                  {recentJobs.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-text-secondary">No generation jobs yet.</p>
                  ) : (
                    recentJobs.map((job) => (
                      <div key={job.id} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium capitalize text-foreground">{job.type.replaceAll("_", " ")}</p>
                          <span className="rounded-[8px] bg-background px-2 py-1 text-xs font-semibold text-text-secondary">
                            {job.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-text-tertiary">{formatDate(job.updatedAt.toISOString())}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-[8px] border border-elevated bg-surface p-4">
                <h2 className="text-base font-semibold text-foreground">Shortcuts</h2>
                <div className="mt-4 grid gap-2">
                  <Link href="/books" className="rounded-[8px] border border-elevated bg-background px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand hover:text-brand">
                    Saved books
                  </Link>
                  <Link href="/upload" className="rounded-[8px] border border-elevated bg-background px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand hover:text-brand">
                    Upload composer
                  </Link>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
