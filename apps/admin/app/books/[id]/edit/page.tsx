import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookUploadForm } from "@/app/upload/BookUploadForm";
import { getBookWithContent } from "@/lib/book-relational";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) return { title: "Book not found" };
  const book = await getBookWithContent(id);
  if (!book) return { title: "Book not found" };
  return { title: book.title };
}

export default async function EditBookPage({ params }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) notFound();

  const book = await getBookWithContent(id);
  if (!book) notFound();

  return (
    <>
      <nav className="border-b border-stone-200/80 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="text-sm font-medium text-stone-600 transition-colors hover:text-amber-800 dark:text-zinc-400 dark:hover:text-amber-200"
            >
              Home
            </Link>
            <Link
              href="/books"
              className="text-sm font-medium text-stone-600 transition-colors hover:text-amber-800 dark:text-zinc-400 dark:hover:text-amber-200"
            >
              Saved books
            </Link>
            <Link
              href="/upload"
              className="text-sm font-medium text-stone-600 transition-colors hover:text-amber-800 dark:text-zinc-400 dark:hover:text-amber-200"
            >
              New book
            </Link>
          </div>
          <span className="truncate text-xs font-medium uppercase tracking-widest text-stone-400 dark:text-zinc-600">
            Books upload
          </span>
        </div>
      </nav>
      <BookUploadForm editContext={{ recordId: book.id, initial: book }} />
    </>
  );
}