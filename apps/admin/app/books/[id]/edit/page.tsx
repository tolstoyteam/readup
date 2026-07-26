import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { BookUploadForm } from "@/app/upload/BookUploadForm";
import { requireAdminPage } from "@/lib/admin-auth";
import { getBookWithContent } from "@/lib/book-relational";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Edit book",
  description: "Edit a saved book in Readup admin.",
};

export default async function EditBookPage({ params }: Props) {
  await requireAdminPage();

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
