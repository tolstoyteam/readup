import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { genreDisplayName, type BookGenre } from "@/lib/book-genres";
import { languageLabel } from "@/lib/book-language";
import { listBooks, type BookListItem } from "@/lib/book-relational";
import { getCoverImageSignedUrl } from "@/lib/cover-signed-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved books",
  description: "Books saved to your database with optional cover images.",
};

export default async function BooksPage() {
  const rows: BookListItem[] = await listBooks();

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
                    : `${rows.length} book${rows.length === 1 ? "" : "s"} · same-size cards, click to edit.`}
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
              {rows.map((row, i) => {
                const coverUrl = coverUrls[i];
                const genrePreview = row.genres.slice(0, 2);
                const genreExtra = row.genres.length - genrePreview.length;
                return (
                  <li key={row.id} className="min-h-0">
                    <Link
                      href={"/books/" + row.id + "/edit"}
                      title={row.title}
                      className="group block h-22 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <article className="flex h-full overflow-hidden rounded-card border border-elevated bg-surface shadow-sm transition-[box-shadow,transform] duration-200 group-hover:border-brand group-hover:shadow-md">
                        <div className="relative h-full w-17 shrink-0 bg-elevated">
                          {coverUrl ? (
                            <img
                              src={coverUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] leading-tight text-text-tertiary">
                              {row.coverImageUrl ? "—" : "∅"}
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-2 pr-3 pl-3">
                          <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                            {row.title}
                          </h2>
                          <p className="truncate text-xs text-text-secondary">
                            {row.author}
                          </p>
                          <p className="truncate text-[11px] text-text-tertiary">
                            {languageLabel(row.language)} · {row.chapterCount}{" "}
                            {row.chapterCount === 1 ? "chapter" : "chapters"}
                          </p>
                          {row.genres.length > 0 ? (
                            <div className="mt-0.5 flex min-h-4.5 flex-wrap items-center gap-1">
                              {genrePreview.map((g) => (
                                <span
                                  key={g}
                                  className="max-w-22 truncate rounded-chip border border-brand/30 bg-brand/10 px-2 py-px text-[10px] font-medium text-brand"
                                >
                                  {genreDisplayName(g as BookGenre)}
                                </span>
                              ))}
                              {genreExtra > 0 ? (
                                <span className="text-[10px] font-medium text-text-tertiary">
                                  +{genreExtra}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <div className="min-h-4.5" aria-hidden />
                          )}
                        </div>
                      </article>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
