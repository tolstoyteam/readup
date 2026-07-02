"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookUploadForm } from "@/app/upload/BookUploadForm";
import { GenerateBookModal } from "@/components/GenerateBookModal";

export function UploadPageClient() {
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(
    () => searchParams.get("generate") === "1",
  );

  return (
    <>
      <BookUploadForm onRequestGenerate={() => setModalOpen(true)} />
      <GenerateBookModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
