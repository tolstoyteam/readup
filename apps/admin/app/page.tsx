import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-linear-to-b from-[#faf8f5] to-[#f0ebe3] px-6 py-24 dark:from-zinc-950 dark:to-zinc-900">
      <main className="max-w-lg text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-amber-800/80 dark:text-amber-200/70">
          Books upload
        </p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-stone-800 dark:text-zinc-50 sm:text-4xl">
          Short books workspace
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          Build chapter-by-chapter content, save the full book as JSON in your database, or copy the
          payload for other tools.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/upload"
            className="inline-flex items-center justify-center rounded-xl bg-amber-700 px-8 py-3.5 text-sm font-semibold text-white shadow-md shadow-amber-900/15 transition-colors hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            Open upload composer
          </Link>
          <Link
            href="/books"
            className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white/80 px-8 py-3.5 text-sm font-semibold text-stone-800 shadow-sm transition-colors hover:border-amber-400 hover:bg-amber-50/80 dark:border-zinc-600 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:border-amber-700 dark:hover:bg-amber-950/40"
          >
            View saved books
          </Link>
        </div>
      </main>
    </div>
  );
}
