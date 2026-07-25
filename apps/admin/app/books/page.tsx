import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { BooksWorkCard } from "@/components/books/BooksWorkCard";
import { listBookWorks, type BookWorkListItem } from "@/lib/book-relational";
import { getCoverImageSignedUrl } from "@/lib/cover-signed-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved books",
  description: "Books saved to your database with optional cover images.",
};

export default async function BooksPage() {
  const rows: BookWorkListItem[] = await listBookWorks();

  const coverUrls = await Promise.all(
    rows.map((row) =>
      row.coverImageUrl
        ? getCoverImageSignedUrl(row.coverImageUrl)
        : Promise.resolve(null as string | null),
    ),
  );

  return (
    <>
      <AdminNav
        links={[
          { href: "/", label: "← Home" },
          { href: "/upload", label: "Upload" },
        ]}
      />

      <div className="min-h-full flex-1 bg-background text-foreground">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <header className="mb-8 border-b border-elevated pb-6">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">
              Library
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground sm:text-3xl">
                  Saved books
                </h1>
                <p className="mt-1 max-w-md text-sm text-text-secondary">
                  {rows.length === 0
                    ? "Nothing here yet — add a book from the composer."
                    : `${rows.length} work${rows.length === 1 ? "" : "s"} · one card per logical book.`}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  href="/upload?generate=1"
                  className="inline-flex items-center justify-center rounded-button border-2 border-brand-dark bg-brand px-4 py-2 text-xs font-semibold text-text-inverse shadow-sm transition-colors hover:bg-brand-dark"
                >
                  Generate with AI
                </Link>
                <Link
                  href="/upload"
                  className="inline-flex items-center justify-center rounded-button border border-elevated bg-surface px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-brand hover:text-brand"
                >
                  New book
                </Link>
              </div>
            </div>
          </header>

          {rows.length === 0 ? (
            <div className="mx-auto max-w-sm rounded-card border border-dashed border-elevated bg-surface p-8 text-center">
              <p className="text-sm text-text-secondary">
                No books saved yet. Compose one and save it from the upload page.
              </p>
              <Link
                href="/upload"
                className="mt-5 inline-flex items-center justify-center rounded-button border-2 border-brand-dark bg-brand px-5 py-2.5 text-sm font-semibold text-text-inverse shadow-sm transition-colors hover:bg-brand-dark"
              >
                Open composer
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((row, i) => (
                <li key={row.id} className="min-h-0">
                  <BooksWorkCard
                    work={{
                      id: row.id,
                      title: row.title,
                      author: row.author,
                      coverImageUrl: row.coverImageUrl,
                      genres: row.editions[0]?.genres ?? [],
                      editions: row.editions.map((edition) => ({
                        id: edition.id,
                        language: edition.language,
                        status: edition.status,
                      })),
                    }}
                    coverUrl={coverUrls[i] ?? null}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
