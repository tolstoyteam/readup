import type { Metadata } from "next";
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
      <UploadPageClient />
    </>
  );
}
