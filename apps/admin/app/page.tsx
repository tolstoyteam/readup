import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-background px-6 py-24">
      <main className="max-w-lg text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-brand">
          Readup admin
        </p>
        <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-foreground sm:text-4xl">
          Short books workspace
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text-secondary">
          Build chapter-by-chapter content, save the full book to your database,
          or let AI draft a summary you can refine before publishing.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/upload?generate=1"
            className="inline-flex min-h-[52px] items-center justify-center rounded-button border-2 border-brand-dark bg-brand px-8 text-[15px] font-semibold text-text-inverse shadow-sm transition-colors hover:bg-brand-dark"
          >
            Generate with AI
          </Link>
          <Link
            href="/upload"
            className="inline-flex min-h-[52px] items-center justify-center rounded-button border border-elevated bg-surface px-8 text-[15px] font-semibold text-foreground transition-colors hover:border-brand hover:text-brand"
          >
            Open upload composer
          </Link>
          <Link
            href="/books"
            className="inline-flex min-h-[52px] items-center justify-center rounded-button px-6 text-sm font-medium text-text-secondary transition-colors hover:text-brand"
          >
            View saved books
          </Link>
        </div>
      </main>
    </div>
  );
}
