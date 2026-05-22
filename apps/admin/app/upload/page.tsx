import type { Metadata } from "next";
import Link from "next/link";
import { BookUploadForm } from "./BookUploadForm";

export const metadata: Metadata = {
  title: "Upload short book",
  description:
    "Compose a short book, optionally add a cover, save to the database, and hear AI narration (three voices) after upload.",
};

export default function UploadPage() {
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
              href="/books"
              className="text-sm font-medium text-stone-600 transition-colors hover:text-amber-800 dark:text-zinc-400 dark:hover:text-amber-200"
            >
              Saved books
            </Link>
          </div>
          <span className="truncate text-xs font-medium uppercase tracking-widest text-stone-400 dark:text-zinc-600">
            Books upload
          </span>
        </div>
      </nav>
      <BookUploadForm />
    </>
  );
}
