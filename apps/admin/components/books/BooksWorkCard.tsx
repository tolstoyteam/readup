"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/books/ConfirmDeleteDialog";
import { genreDisplayName, type BookGenre } from "@/lib/book-genres";
import { languageLabel } from "@/lib/book-language";

export type BooksWorkCardEdition = {
  id: number;
  language: string;
  status: string;
};

export type BooksWorkCardData = {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
  genres: string[];
  editions: BooksWorkCardEdition[];
};

type PendingDelete =
  | { kind: "edition"; editionId: number; language: string }
  | { kind: "work" };

type BooksWorkCardProps = {
  work: BooksWorkCardData;
  coverUrl: string | null;
};

export function BooksWorkCard({ work, coverUrl }: BooksWorkCardProps) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const genrePreview = work.genres.slice(0, 2);
  const genreExtra = work.genres.length - genrePreview.length;

  function openEditionDelete(editionId: number, language: string) {
    setError(null);
    setPending({ kind: "edition", editionId, language });
  }

  function openWorkDelete() {
    setError(null);
    setPending({ kind: "work" });
  }

  function closeDialog() {
    if (busy) return;
    setPending(null);
    setError(null);
  }

  async function confirmDelete() {
    if (!pending) return;
    setBusy(true);
    setError(null);

    const url =
      pending.kind === "edition"
        ? `/api/books/${pending.editionId}`
        : `/api/books/works/${work.id}`;

    try {
      const res = await fetch(url, { method: "DELETE" });
      let body: { error?: string } = {};
      try {
        body = (await res.json()) as { error?: string };
      } catch {
        /* non-JSON */
      }

      if (!res.ok) {
        setError(body.error || `Delete failed (${res.status})`);
        return;
      }

      setPending(null);
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const dialogTitle =
    pending?.kind === "edition"
      ? `Delete the ${languageLabel(pending.language)} version?`
      : "Delete this entire book?";

  const dialogDescription =
    pending?.kind === "edition"
      ? "This action cannot be undone.\nOnly the selected language version will be removed."
      : "This will permanently remove every language version and all associated content.\n\nThis action cannot be undone.";

  return (
    <>
      <article className="flex h-full min-h-32 overflow-hidden rounded-card border border-elevated bg-surface shadow-sm">
        <div className="relative h-full w-17 shrink-0 bg-elevated">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] leading-tight text-text-tertiary">
              {work.coverImageUrl ? "—" : "∅"}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-2 pr-3 pl-3">
          <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {work.title}
          </h2>
          <p className="truncate text-xs text-text-secondary">{work.author}</p>
          <p className="truncate text-[11px] text-text-tertiary">
            {work.editions.length}{" "}
            {work.editions.length === 1 ? "edition" : "editions"} · shared cover
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {work.editions.map((edition) => (
              <span
                key={edition.id}
                className="inline-flex max-w-full items-center gap-0.5 rounded-chip border border-brand/30 bg-brand/10 text-[10px] font-medium text-brand"
              >
                <Link
                  href={"/books/" + edition.id + "/edit"}
                  className="px-2 py-px hover:bg-brand/15"
                >
                  {languageLabel(edition.language)} · {edition.status}
                </Link>
                <button
                  type="button"
                  title={`Delete ${languageLabel(edition.language)}`}
                  aria-label={`Delete ${languageLabel(edition.language)} version`}
                  onClick={() => openEditionDelete(edition.id, edition.language)}
                  className="border-l border-brand/25 px-1.5 py-px text-danger hover:bg-danger/10"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          {work.genres.length ? (
            <div className="mt-0.5 flex min-h-4.5 flex-wrap items-center gap-1">
              {genrePreview.map((g) => (
                <span
                  key={g}
                  className="max-w-22 truncate rounded-chip border border-brand/30 bg-brand/10 px-2 py-px text-[10px] font-medium text-brand"
                >
                  {genreDisplayName(g as BookGenre)}
                </span>
              ))}
              {genreExtra > 0 ? (
                <span className="text-[10px] font-medium text-text-tertiary">
                  +{genreExtra}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="min-h-4.5" aria-hidden />
          )}
          <div className="mt-1.5">
            <button
              type="button"
              onClick={openWorkDelete}
              className="text-[10px] font-semibold text-danger underline-offset-2 hover:underline"
            >
              Delete book
            </button>
          </div>
        </div>
      </article>

      <ConfirmDeleteDialog
        open={pending !== null}
        title={dialogTitle}
        description={dialogDescription}
        confirmLabel={pending?.kind === "work" ? "Delete book" : "Delete language"}
        busy={busy}
        error={error}
        onCancel={closeDialog}
        onConfirm={confirmDelete}
      />
    </>
  );
}
