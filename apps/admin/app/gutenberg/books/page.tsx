import type { Metadata } from "next";
import { AdminShell } from "@/components/AdminShell";
import { requireAdminPage } from "@/lib/admin-auth";
import { GutenbergBooksClient } from "./GutenbergBooksClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved Gutenberg books",
  description: "Generate and publish saved Gutenberg books to the Readup mobile app.",
};

export default async function SavedGutenbergBooksPage() {
  await requireAdminPage();
  return (
    <AdminShell active="gutenbergBooks">
      <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-8 lg:p-10">
        <header>
          <h1 className="text-[28px] font-bold leading-tight text-foreground">Saved Gutenberg books</h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Review collected books and generate finished Readup editions for the mobile app,
            one book at a time or in batches.
          </p>
        </header>
        <GutenbergBooksClient />
      </div>
    </AdminShell>
  );
}
