"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BOOK_LENGTHS, READING_LEVELS } from "@readup/db";
import type { ProgressEvent } from "@/lib/book-generation/types";
import { validateCoverFile } from "@/app/upload/BookUploadForm";
import { LanguageSelector } from "@/components/LanguageSelector";

const SOURCE_ACCEPT = ".txt,.md,.markdown,application/pdf,text/plain,text/markdown";
const SOURCE_LANGUAGE = "en";

const LENGTH_LABELS: Record<(typeof BOOK_LENGTHS)[number], string> = {
  short: "Short",
  medium: "Medium",
  long: "Long",
};

const READING_LEVEL_LABELS: Record<(typeof READING_LEVELS)[number], string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function GenerateBookModal({ open, onClose }: Props) {
  const router = useRouter();
  const headingId = useId();
  const topicId = useId();
  const coverId = useId();
  const sourceId = useId();

  const [topic, setTopic] = useState("");
  const [readingLevel, setReadingLevel] =
    useState<(typeof READING_LEVELS)[number]>("intermediate");
  const [length, setLength] = useState<(typeof BOOK_LENGTHS)[number]>("medium");
  const [languages, setLanguages] = useState<string[]>([SOURCE_LANGUAGE]);
  const [includeQuiz, setIncludeQuiz] = useState(true);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverHint, setCoverHint] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<{ language: string; error: string }[]>([]);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topicInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const sourceInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    topicInputRef.current?.focus();
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
    setTopic("");
    setReadingLevel("intermediate");
    setLength("medium");
    setLanguages([SOURCE_LANGUAGE]);
    setIncludeQuiz(true);
    setCoverFile(null);
    setCoverHint(null);
    setSourceFile(null);
    setError(null);
    setWarnings([]);
    setProgressMessage(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
    if (sourceInputRef.current) sourceInputRef.current.value = "";
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetState();
    onClose();
  };

  async function consumeWorkflowStream(response: Response) {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response stream from the server.");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part
          .split("\n")
          .find((entry) => entry.startsWith("data: "));
        if (!line) continue;
        const event = JSON.parse(line.slice(6)) as ProgressEvent;
        if (event.step === "error") {
          throw new Error(event.message);
        }
        if ("message" in event && event.message) {
          setProgressMessage(event.message);
        }
        if (event.step === "completed") {
          if (event.warnings?.length) {
            setWarnings(event.warnings);
          }
          return event;
        }
      }
    }

    throw new Error("Generation ended unexpectedly.");
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setWarnings([]);

    const trimmedTopic = topic.trim();
    if (!trimmedTopic) {
      setError("Topic is required.");
      topicInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setProgressMessage("Starting...");

    try {
      const formData = new FormData();
      formData.append("topic", trimmedTopic);
      formData.append("reading_level", readingLevel);
      formData.append("length", length);
      formData.append("include_quiz", includeQuiz ? "true" : "false");
      formData.append(
        "languages",
        JSON.stringify(languages.filter((code) => code !== SOURCE_LANGUAGE)),
      );
      if (sourceFile) formData.append("source", sourceFile);
      if (coverFile) formData.append("cover", coverFile);

      const response = await fetch("/api/books/generate-workflow", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Book generation failed.");
      }

      const completed = await consumeWorkflowStream(response);
      resetState();
      onClose();
      router.push("/books");
      router.refresh();
      void completed;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Book generation failed.");
      setProgressMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        aria-label="Close dialog"
        onClick={handleClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-card border border-elevated bg-background p-6 shadow-xl sm:p-8">
        <header className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">
            AI assist
          </p>
          <h2
            id={headingId}
            className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-foreground"
          >
            AI Book Generation
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Configure the book, generate the English source edition, and any selected
            translations. Optionally upload a cover — the pipeline saves automatically when
            complete.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label htmlFor={topicId} className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
              Topic <span className="text-danger">*</span>
            </span>
            <input
              id={topicId}
              ref={topicInputRef}
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. Atomic Habits"
              autoComplete="off"
              required
              maxLength={200}
              className="w-full rounded-input border border-elevated bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 disabled:opacity-60"
            />
          </label>

          <fieldset>
            <legend className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
              Reading level
            </legend>
            <div className="flex flex-wrap gap-2">
              {READING_LEVELS.map((value) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-chip border px-3 py-1.5 text-sm font-medium transition-colors ${
                    readingLevel === value
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-elevated bg-surface text-foreground hover:border-brand/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="reading_level"
                    value={value}
                    checked={readingLevel === value}
                    onChange={() => setReadingLevel(value)}
                    disabled={isSubmitting}
                    className="sr-only"
                  />
                  {READING_LEVEL_LABELS[value]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
              Length
            </legend>
            <div className="flex flex-wrap gap-2">
              {BOOK_LENGTHS.map((value) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-chip border px-3 py-1.5 text-sm font-medium transition-colors ${
                    length === value
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-elevated bg-surface text-foreground hover:border-brand/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="length"
                    value={value}
                    checked={length === value}
                    onChange={() => setLength(value)}
                    disabled={isSubmitting}
                    className="sr-only"
                  />
                  {LENGTH_LABELS[value]}
                </label>
              ))}
            </div>
          </fieldset>

          <LanguageSelector
            selected={languages}
            onChange={setLanguages}
            disabled={isSubmitting}
          />

          <label className="flex cursor-pointer items-center gap-3 rounded-input border border-elevated bg-surface px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={includeQuiz}
              onChange={(event) => setIncludeQuiz(event.target.checked)}
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-elevated text-brand focus:ring-brand/30"
            />
            <span className="font-medium text-foreground">Include quizzes</span>
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
              <p className="mt-1 text-xs text-text-tertiary">Selected: {coverFile.name}</p>
            ) : null}
            {coverHint ? (
              <p className="mt-1 text-xs text-danger">{coverHint}</p>
            ) : null}
          </label>

          <label htmlFor={sourceId} className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
              Source file <span className="text-text-tertiary">(optional)</span>
            </span>
            <input
              id={sourceId}
              ref={sourceInputRef}
              type="file"
              accept={SOURCE_ACCEPT}
              disabled={isSubmitting}
              onChange={(event) => {
                setSourceFile(event.target.files?.[0] ?? null);
              }}
              className="w-full text-sm text-foreground file:mr-3 file:rounded-button file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground file:border-elevated hover:file:bg-elevated disabled:opacity-60"
            />
            <p className="mt-1 text-xs text-text-tertiary">
              Plain text (.txt, .md) or PDF, up to 10 MB.
            </p>
          </label>

          {progressMessage && isSubmitting ? (
            <div className="flex items-center gap-3 rounded-card border border-brand/30 bg-brand/5 p-3 text-sm text-foreground">
              <Spinner />
              <span>{progressMessage}</span>
            </div>
          ) : null}

          {warnings.length > 0 ? (
            <div className="rounded-card border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              <p className="font-semibold">Some translations failed:</p>
              <ul className="mt-1 list-disc pl-5">
                {warnings.map((warning) => (
                  <li key={warning.language}>
                    {warning.language}: {warning.error}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

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
                  <Spinner inverse />
                  Generating…
                </>
              ) : (
                "Generate Book"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Spinner({ inverse = false }: { inverse?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 ${
        inverse
          ? "border-text-inverse/40 border-t-text-inverse"
          : "border-brand/30 border-t-brand"
      }`}
    />
  );
}
