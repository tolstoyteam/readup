import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/AdminShell";
import { requireAdminPage } from "@/lib/admin-auth";
import { UploadPageClient } from "./UploadPageClient";

export const metadata: Metadata = {
  title: "Upload short book",
  description:
    "Compose a short book manually, or use AI to generate multilingual editions with optional narration.",
};

export default async function UploadPage() {
  await requireAdminPage();

  return (
    <AdminShell active="upload">
      <Suspense
        fallback={
          <main className="min-h-full bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
            <p className="text-sm text-muted-foreground">Loading composer...</p>
          </main>
        }
      >
        <UploadPageClient />
      </Suspense>
    </AdminShell>
  );
}
