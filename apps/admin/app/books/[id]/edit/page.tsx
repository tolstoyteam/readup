import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
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
      <AdminNav
        links={[
          { href: "/", label: "← Home" },
          { href: "/books", label: "Saved books" },
          { href: "/upload", label: "New book" },
        ]}
      />
      <BookUploadForm editContext={{ recordId: book.id, initial: book }} />
    </>
  );
}
