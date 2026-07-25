"use client";

import { useId } from "react";

type ConfirmDeleteDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  busy = false,
  error = null,
  onCancel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const headingId = useId();

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
    >
      <button
        type="button"
        aria-label="Cancel"
        onClick={busy ? undefined : onCancel}
        disabled={busy}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-md rounded-card border border-elevated bg-background p-6 shadow-xl">
        <h2
          id={headingId}
          className="text-lg font-extrabold tracking-[-0.02em] text-foreground"
        >
          {title}
        </h2>
        <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">
          {description}
        </p>

        {error ? (
          <p className="mt-3 rounded-button border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-button border border-elevated bg-surface px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-button border-2 border-danger bg-danger px-4 py-2 text-xs font-semibold text-text-inverse shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
