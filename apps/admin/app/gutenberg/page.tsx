import type { Metadata } from "next";
import { AdminShell } from "@/components/AdminShell";
import { requireAdminPage } from "@/lib/admin-auth";
import { GutenbergImportClient } from "./GutenbergImportClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Import from Gutenberg",
  description: "Fetch public-domain books and generate Readup short editions.",
};

export default async function GutenbergImportPage() {
  await requireAdminPage();

  return (
    <AdminShell active="gutenberg">
      <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-8 lg:p-10">
        <header className="mb-2">
          <h1 className="text-[28px] font-bold leading-tight text-foreground">
            Import from Gutenberg
          </h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Fetch public-domain books and generate Advanced / Long editions in
            English and Russian with quizzes, quotes, keywords, and TTS — using
            the same pipeline as Generate Book.
          </p>
        </header>

        <GutenbergImportClient />
      </div>
    </AdminShell>
  );
}
