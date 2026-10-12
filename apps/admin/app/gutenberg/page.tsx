import type { Metadata } from "next";
import { AdminShell } from "@/components/AdminShell";
import { requireAdminPage } from "@/lib/admin-auth";
import { GutenbergLibraryClient } from "./GutenbergLibraryClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gutenberg source library",
  description: "Save Gutenberg source books or generate Readup editions.",
};

export default async function GutenbergImportPage() {
  await requireAdminPage();

  return (
    <AdminShell active="gutenberg">
      <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-8 lg:p-10">
        <header className="mb-2">
          <h1 className="text-[28px] font-bold leading-tight text-foreground">
            Gutenberg source library
          </h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Collect source books for later review and AI processing.
          </p>
        </header>

        <GutenbergLibraryClient />
      </div>
    </AdminShell>
  );
}
