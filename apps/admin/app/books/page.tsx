import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { requireAdminPage } from "@/lib/admin-auth";
import { listBookWorks, type BookWorkListItem } from "@/lib/book-relational";
import { languageLabel } from "@/lib/book-language";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved books",
  description: "Books saved to your database with optional cover images.",
};

export default async function BooksPage() {
  await requireAdminPage();

  const rows: BookWorkListItem[] = await listBookWorks();

  return (
    <AdminShell active="books">
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Books</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {rows.length === 0
                ? "No books uploaded yet."
                : `${rows.length} book${rows.length === 1 ? "" : "s"} in the library.`}
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

        <section className="overflow-hidden rounded-[8px] border border-elevated bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="bg-background text-xs uppercase text-text-tertiary">
                <tr>
                  <th className="px-4 py-3 font-semibold">Book</th>
                  <th className="px-4 py-3 font-semibold">Languages</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Genres</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="border-t border-elevated px-4 py-5 text-sm text-text-secondary">
                      Upload or generate a book to see it here.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const primaryEdition = row.editions[0];
                    return (
                      <tr key={row.id} className="border-t border-elevated">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{row.title}</div>
                          <div className="mt-1 text-xs text-text-tertiary">{row.author}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {row.editions.map((edition) => (
                              <Link
                                key={edition.id}
                                href={`/books/${edition.id}/edit`}
                                className="rounded-[8px] bg-brand/10 px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/15"
                              >
                                {languageLabel(edition.language)}
                              </Link>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {row.editions.map((edition) => (
                              <span
                                key={edition.id}
                                className="rounded-[8px] bg-background px-2 py-1 text-xs font-semibold text-text-secondary"
                              >
                                {edition.status}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {primaryEdition?.genres.length ? primaryEdition.genres.join(", ") : "None"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {primaryEdition ? (
                            <Link
                              href={`/books/${primaryEdition.id}/edit`}
                              className="inline-flex min-h-9 items-center justify-center rounded-[8px] border border-brand/40 bg-brand/10 px-3 text-xs font-semibold text-brand transition-colors hover:bg-brand/15"
                            >
                              Edit
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
