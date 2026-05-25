"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookUploadForm,
  bookContentInputToEditorValues,
} from "@/app/upload/BookUploadForm";
import {
  GenerateBookModal,
  type GenerateBookResult,
} from "@/components/GenerateBookModal";
import type { BookEditorValues } from "./types";

type DraftState = {
  /** Bumped each time we apply a new draft so the form remounts cleanly. */
  key: number;
  values?: BookEditorValues;
  cover?: File | null;
};

export function UploadPageClient() {
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(
    () => searchParams.get("generate") === "1",
  );
  const [draft, setDraft] = useState<DraftState>({ key: 0 });

  const handleGenerated = ({ book, cover }: GenerateBookResult) => {
    setDraft((current) => ({
      key: current.key + 1,
      values: bookContentInputToEditorValues(book),
      cover,
    }));
  };

  return (
    <>
      <BookUploadForm
        key={draft.key}
        initialDraft={draft.values}
        initialCoverFile={draft.cover ?? null}
        onRequestGenerate={() => setModalOpen(true)}
      />
      <GenerateBookModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onGenerated={handleGenerated}
      />
    </>
  );
}
