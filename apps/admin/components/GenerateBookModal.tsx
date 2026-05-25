"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BookContentInput } from "@/lib/book-content";
import { validateCoverFile } from "@/app/upload/BookUploadForm";

const SOURCE_ACCEPT = ".txt,.md,.markdown,application/pdf,text/plain,text/markdown";

export type GenerateBookResult = {
  book: BookContentInput;
  cover: File | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onGenerated: (result: GenerateBookResult) => void;
};

export function GenerateBookModal({ open, onClose, onGenerated }: Props) {
  const router = useRouter();
  const titleId = useId();
  const coverId = useId();
  const sourceId = useId();

  const [title, setTitle] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverHint, setCoverHint] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const sourceInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    titleInputRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, isSubmitting, onClose]);

  const resetState = () => {
    setTitle("");
    setCoverFile(null);
    setCoverHint(null);
    setSourceFile(null);
    setError(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
    if (sourceInputRef.current) sourceInputRef.current.value = "";
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetState();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Book title is required.");
      titleInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", trimmedTitle);
      if (sourceFile) formData.append("source", sourceFile);

      const response = await fetch("/api/books/generate", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => ({}))) as
        | { ok: true; book: BookContentInput }
        | { error: string };

      if (!response.ok || !("ok" in data) || !data.ok) {
        const message =
          "error" in data && typeof data.error === "string"
            ? data.error
            : "AI generation failed. Please try again.";
        throw new Error(message);
      }

      onGenerated({ book: data.book, cover: coverFile });
      resetState();
      router.replace("/upload");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI generation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${titleId}-heading`}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={handleClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-lg rounded-card border border-elevated bg-background p-6 shadow-xl sm:p-8">
        <header className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">
            AI assist
          </p>
          <h2
            id={`${titleId}-heading`}
            className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-foreground"
          >
            Generate with AI
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Give the title (required) and optionally a cover and a source file.
            The generated draft pre-fills the composer for review before saving.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor={titleId} className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
              Book title <span className="text-danger">*</span>
            </span>
            <input
              id={titleId}
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. Atomic Habits"
              autoComplete="off"
              required
              maxLength={200}
              className="w-full rounded-input border border-elevated bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 disabled:opacity-60"
            />
          </label>

          <label htmlFor={coverId} className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
              Upload cover <span className="text-text-tertiary">(optional)</span>
            </span>
            <input
              id={coverId}
              ref={coverInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              disabled={isSubmitting}
              onChange={async (event) => {
                const file = event.target.files?.[0] ?? null;
                setCoverHint(null);
                if (!file) {
                  setCoverFile(null);
                  return;
                }
                const message = await validateCoverFile(file);
                if (message) {
                  setCoverHint(message);
                  setCoverFile(null);
                  event.target.value = "";
                  return;
                }
                setCoverFile(file);
              }}
              className="w-full text-sm text-foreground file:mr-3 file:rounded-button file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-text-inverse hover:file:bg-brand-dark disabled:opacity-60"
            />
            {coverFile ? (
              <p className="mt-1 text-xs text-text-tertiary">
                Selected: {coverFile.name}
              </p>
            ) : null}
            {coverHint ? (
              <p className="mt-1 text-xs text-danger">{coverHint}</p>
            ) : null}
          </label>

          <label htmlFor={sourceId} className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
              Upload book <span className="text-text-tertiary">(optional)</span>
            </span>
            <input
              id={sourceId}
              ref={sourceInputRef}
              type="file"
              accept={SOURCE_ACCEPT}
              disabled={isSubmitting}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSourceFile(file);
              }}
              className="w-full text-sm text-foreground file:mr-3 file:rounded-button file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground file:border-elevated hover:file:bg-elevated disabled:opacity-60"
            />
            <p className="mt-1 text-xs text-text-tertiary">
              Plain text (.txt, .md) or PDF, up to 10 MB.
            </p>
            {sourceFile ? (
              <p className="mt-1 text-xs text-text-tertiary">
                Selected: {sourceFile.name}
              </p>
            ) : null}
          </label>

          {error ? (
            <p
              role="alert"
              className="rounded-card border border-danger/40 bg-danger/10 p-3 text-sm font-medium text-danger"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-button border border-elevated bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-button border-2 border-brand-dark bg-brand px-6 py-2.5 text-sm font-semibold text-text-inverse shadow-sm transition-colors hover:bg-brand-dark disabled:pointer-events-none disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  Generating…
                </>
              ) : (
                "Generate"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-text-inverse/40 border-t-text-inverse"
    />
  );
}
