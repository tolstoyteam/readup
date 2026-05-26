import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminNav } from "@/components/AdminNav";
import { UploadPageClient } from "./UploadPageClient";

export const metadata: Metadata = {
  title: "Upload short book",
  description:
    "Compose a short book, optionally add a cover, save to the database, and hear AI narration (three voices) after upload.",
};

export default function UploadPage() {
  return (
    <>
      <AdminNav
        links={[
          { href: "/", label: "← Home" },
          { href: "/books", label: "Saved books" },
        ]}
      />
      <Suspense
        fallback={
          <main className="min-h-full bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
            <p className="text-sm text-text-secondary">Loading composer…</p>
          </main>
        }
      >
        <UploadPageClient />
      </Suspense>
    </>
  );
}
