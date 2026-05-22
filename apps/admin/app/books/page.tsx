import type { Metadata } from "next";
import Link from "next/link";
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
      <nav className="border-b border-stone-200/80 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="text-sm font-medium text-stone-600 transition-colors hover:text-amber-800 dark:text-zinc-400 dark:hover:text-amber-200"
            >
              ← Home
            </Link>
            <Link
              href="/upload"
              className="text-sm font-medium text-stone-600 transition-colors hover:text-amber-800 dark:text-zinc-400 dark:hover:text-amber-200"
            >
              Upload
            </Link>
          </div>
          <span className="truncate text-xs font-medium uppercase tracking-widest text-stone-400 dark:text-zinc-600">
            Books upload
          </span>
        </div>
      </nav>

      <div className="min-h-full flex-1 bg-linear-to-b from-[#faf8f5] via-[#f7f4ef] to-[#f0ebe3] text-stone-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 dark:text-zinc-100">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <header className="mb-8 border-b border-stone-200/80 pb-6 dark:border-zinc-800">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-amber-800/80 dark:text-amber-200/70">
              Library
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-serif text-2xl font-semibold tracking-tight text-stone-800 dark:text-zinc-50 sm:text-3xl">
                  Saved books
                </h1>
                <p className="mt-1 max-w-md text-sm text-stone-600 dark:text-zinc-400">
                  {rows.length === 0
                    ? "Nothing here yet — add a book from the composer."
                    : `${rows.length} book${rows.length === 1 ? "" : "s"} · same-size cards, click to edit.`}
                </p>
              </div>
              <Link
                href="/upload"
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
              >
                New book
              </Link>
            </div>
          </header>

          {rows.length === 0 ? (
            <div className="mx-auto max-w-sm rounded-xl border border-dashed border-stone-300/90 bg-white/60 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
              <p className="text-sm text-stone-600 dark:text-zinc-400">
                No books saved yet. Compose one and save it from the upload page.
              </p>
              <Link
                href="/upload"
                className="mt-5 inline-flex items-center justify-center rounded-lg bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
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
                      className="group block h-22 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f4ef] dark:focus-visible:ring-offset-zinc-900"
                    >
                      <article className="flex h-full overflow-hidden rounded-xl border border-stone-200/90 bg-white/95 shadow-sm transition-[box-shadow,transform] duration-200 group-hover:border-amber-200/80 group-hover:shadow-md dark:border-zinc-700/80 dark:bg-zinc-900/95 dark:group-hover:border-amber-900/50">
                        <div className="relative h-full w-17 shrink-0 bg-stone-100 dark:bg-zinc-800">
                          {coverUrl ? (
                            <img
                              src={coverUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] leading-tight text-stone-400 dark:text-zinc-500">
                              {row.coverImageUrl ? "—" : "∅"}
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-2 pr-3 pl-3">
                          <h2 className="line-clamp-2 font-serif text-sm font-semibold leading-snug text-stone-800 dark:text-zinc-50">
                            {row.title}
                          </h2>
                          <p className="truncate text-xs text-stone-600 dark:text-zinc-400">{row.author}</p>
                          <p className="truncate text-[11px] text-stone-500 dark:text-zinc-500">
                            {languageLabel(row.language)} · {row.chapterCount}{" "}
                            {row.chapterCount === 1 ? "chapter" : "chapters"}
                          </p>
                          {row.genres.length > 0 ? (
                            <div className="mt-0.5 flex min-h-4.5 flex-wrap items-center gap-1">
                              {genrePreview.map((g) => (
                                <span
                                  key={g}
                                  className="max-w-22 truncate rounded border border-amber-200/70 bg-amber-50/90 px-1 py-px text-[10px] text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100"
                                >
                                  {genreDisplayName(g as BookGenre)}
                                </span>
                              ))}
                              {genreExtra > 0 ? (
                                <span className="text-[10px] font-medium text-stone-400 dark:text-zinc-500">
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
