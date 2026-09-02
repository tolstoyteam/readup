import { AdminShell } from "@/components/AdminShell";
import { BookCoverThumbnail } from "@/components/books/BookCoverThumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { requireAdminPage } from "@/lib/admin-auth";
import { languageLabel } from "@/lib/book-language";
import { listBookWorks, type BookWorkListItem } from "@/lib/book-relational";
import { resolveCoverDisplayUrl } from "@/lib/cover-signed-url";
import type { Metadata } from "next";
import Link from "next/link";
import { DeleteBookDialog } from "./DeleteBookDialog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved books",
  description: "Books saved to your database with optional cover images.",
};

export default async function BooksPage() {
  await requireAdminPage();

  const rows: BookWorkListItem[] = await listBookWorks();
  const rowsWithCovers = await Promise.all(
    rows.map(async (row) => ({
      row,
      coverSrc: await resolveCoverDisplayUrl(row.coverImageUrl),
    })),
  );

  return (
    <AdminShell active="books">
      <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-8 lg:p-10">
        <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[28px] font-bold leading-tight text-foreground">Books</h1>
            <p className="mt-2 text-base text-muted-foreground">
              {rows.length === 0
                ? "No books uploaded yet."
                : `${rows.length} book${rows.length === 1 ? "" : "s"} in the library.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/upload?generate=1" />}
            >
              Generate
            </Button>
            <Button nativeButton={false} render={<Link href="/upload" />}>
              New book
            </Button>
          </div>
        </header>

        <section className="min-w-0 overflow-hidden rounded-card border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Languages</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Genres</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-muted-foreground">
                    Upload or generate a book to see it here.
                  </TableCell>
                </TableRow>
              ) : (
                rowsWithCovers.map(({ row, coverSrc }) => {
                  const primaryEdition = row.editions[0];
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          <BookCoverThumbnail src={coverSrc} />
                          <div className="min-w-0">
                            <div className="font-medium">{row.title}</div>
                            <div className="text-xs text-muted-foreground">{row.author}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.editions.map((edition) => (
                            <Badge
                              key={edition.id}
                              variant="secondary"
                              render={<Link href={`/books/${edition.id}/edit`} />}
                            >
                              {languageLabel(edition.language)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.editions.map((edition) => (
                            <Badge key={edition.id} variant="outline">
                              {edition.status}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate text-muted-foreground">
                        {primaryEdition?.genres.length ? primaryEdition.genres.join(", ") : "None"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {primaryEdition ? (
                            <Button
                              nativeButton={false}
                              size="sm"
                              variant="outline"
                              render={<Link href={`/books/${primaryEdition.id}/edit`} />}
                            >
                              Edit
                            </Button>
                          ) : null}
                          <DeleteBookDialog workId={row.id} title={row.title} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </section>
      </div>
    </AdminShell>
  );
}
