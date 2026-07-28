"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BOOK_LENGTHS, READING_LEVELS } from "@readup/db";
import { getLengthPreset } from "@/lib/book-generation/length-presets";
import { validateCoverFile } from "@/app/upload/BookUploadForm";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

const SOURCE_ACCEPT = ".txt,.md,.markdown,application/pdf,text/plain,text/markdown";
const SOURCE_LANGUAGE = "en";
const ACTIVE_GENERATION_JOB_KEY = "readup:book-generation-job:v1";

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

type GenerationJobResponse = {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  last_error: string | null;
  progress: { message: string } | null;
  result: {
    work_id: string;
    editions: { language: string; id: number }[];
    warnings?: { language: string; error: string }[];
  } | null;
  busy?: boolean;
  retry_after_ms?: number;
};

function saveActiveGenerationJob(jobId: string) {
  try {
    window.localStorage.setItem(ACTIVE_GENERATION_JOB_KEY, jobId);
  } catch {
    // Resuming still works in the current tab when storage is unavailable.
  }
}

function loadActiveGenerationJob(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_GENERATION_JOB_KEY);
  } catch {
    return null;
  }
}

function clearActiveGenerationJob() {
  try {
    window.localStorage.removeItem(ACTIVE_GENERATION_JOB_KEY);
  } catch {
    // The completed job no longer appears in component state either way.
  }
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runGenerationJob(
  jobId: string,
  onMessage: (message: string) => void,
): Promise<GenerationJobResponse> {
  while (true) {
    const res = await fetch(`/api/generation-jobs/${jobId}/advance`, {
      method: "POST",
      cache: "no-store",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? `Generation step failed. Job id: ${jobId}.`);
    }
    const data = (await res.json()) as GenerationJobResponse;
    if (data.progress?.message) {
      onMessage(data.progress.message);
    }
    if (data.status === "succeeded") return data;
    if (data.status === "failed") {
      throw new Error(data.last_error ?? "Book generation failed.");
    }
    if (data.busy) {
      await wait(Math.min(Math.max(data.retry_after_ms ?? 1000, 500), 5000));
    } else {
      await wait(150);
    }
  }
}

export function GenerateBookModal({ open, onClose }: Props) {
  const router = useRouter();
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
  const [resumableJobId, setResumableJobId] = useState<string | null>(null);

  const topicInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const sourceInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    topicInputRef.current?.focus();
    const frame = window.requestAnimationFrame(() => {
      setResumableJobId(loadActiveGenerationJob());
    });
    return () => window.cancelAnimationFrame(frame);
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

  const continueGeneration = async (jobId: string) => {
    const job = await runGenerationJob(jobId, setProgressMessage);
    if (job.result?.warnings?.length) {
      setWarnings(job.result.warnings);
    }
    clearActiveGenerationJob();
    setResumableJobId(null);
    resetState();
    onClose();
    router.push("/books");
    router.refresh();
  };

  const handleResume = async () => {
    if (!resumableJobId) return;
    setError(null);
    setWarnings([]);
    setIsSubmitting(true);
    setProgressMessage("Resuming generation...");
    try {
      await continueGeneration(resumableJobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Book generation failed.");
      setProgressMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

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

      if (response.status !== 202) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Book generation failed.");
      }

      const started = (await response.json()) as { job_id?: string };
      if (!started.job_id) {
        throw new Error("Server did not return a generation job id.");
      }

      saveActiveGenerationJob(started.job_id);
      setResumableJobId(started.job_id);
      await continueGeneration(started.job_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Book generation failed.");
      setProgressMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>AI book generation</DialogTitle>
          <DialogDescription>
            Configure the book, generate the English source edition, and any selected
            translations. Optionally upload a cover — the pipeline saves automatically when
            complete.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
          <Field>
            <FieldLabel htmlFor={topicId}>Topic *</FieldLabel>
            <Input
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
            />
          </Field>

          <FieldSet>
            <FieldLegend variant="label">Reading level</FieldLegend>
            <RadioGroup
              value={readingLevel}
              onValueChange={(value) =>
                setReadingLevel(value as (typeof READING_LEVELS)[number])
              }
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            >
              {READING_LEVELS.map((value) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm"
                >
                  <RadioGroupItem
                    value={value}
                    disabled={isSubmitting}
                  />
                  {READING_LEVEL_LABELS[value]}
                </label>
              ))}
            </RadioGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend variant="label">Length</FieldLegend>
            <RadioGroup
              value={length}
              onValueChange={(value) => setLength(value as (typeof BOOK_LENGTHS)[number])}
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            >
              {BOOK_LENGTHS.map((value) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm"
                >
                  <RadioGroupItem
                    value={value}
                    disabled={isSubmitting}
                  />
                  {LENGTH_LABELS[value]}
                </label>
              ))}
            </RadioGroup>
            <FieldDescription>{getLengthPreset(length).uiHint}</FieldDescription>
          </FieldSet>

          <LanguageSelector
            selected={languages}
            onChange={setLanguages}
            disabled={isSubmitting}
          />

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-2 text-sm">
            <Checkbox
              checked={includeQuiz}
              onCheckedChange={(checked) => setIncludeQuiz(checked)}
              disabled={isSubmitting}
            />
            <span className="font-medium text-foreground">Include quizzes</span>
          </label>

          <Field>
            <FieldLabel htmlFor={coverId}>Upload cover optional</FieldLabel>
            <Input
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
            />
            {coverFile ? (
              <FieldDescription>Selected: {coverFile.name}</FieldDescription>
            ) : null}
            {coverHint ? (
              <FieldDescription className="text-destructive">{coverHint}</FieldDescription>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor={sourceId}>Source file optional</FieldLabel>
            <Input
              id={sourceId}
              ref={sourceInputRef}
              type="file"
              accept={SOURCE_ACCEPT}
              disabled={isSubmitting}
              onChange={(event) => {
                setSourceFile(event.target.files?.[0] ?? null);
              }}
            />
            <FieldDescription>Plain text (.txt, .md) or PDF, up to 10 MB.</FieldDescription>
          </Field>

          {progressMessage && isSubmitting ? (
            <Alert>
              <Spinner />
              <AlertDescription>{progressMessage}</AlertDescription>
            </Alert>
          ) : null}

          {resumableJobId && !isSubmitting ? (
            <Alert>
              <AlertTitle>Unfinished generation found</AlertTitle>
              <AlertDescription>
                Resume the saved job from its last completed edition or audio part.
              </AlertDescription>
            </Alert>
          ) : null}

          {warnings.length > 0 ? (
            <Alert variant="destructive">
              <AlertTitle>Some translations failed</AlertTitle>
              <AlertDescription>
                <ul className="mt-1 list-disc pl-5">
                  {warnings.map((warning) => (
                    <li key={warning.language}>
                      {warning.language}: {warning.error}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {resumableJobId && !isSubmitting ? (
              <Button type="button" variant="outline" onClick={handleResume}>
                Resume generation
              </Button>
            ) : null}
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner inverse />
                  Generating…
                </>
              ) : (
                "Generate Book"
              )}
            </Button>
          </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Spinner({ inverse = false }: { inverse?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-4 animate-spin rounded-full border-2 ${
        inverse
          ? "border-primary-foreground/40 border-t-primary-foreground"
          : "border-primary/30 border-t-primary"
      }`}
    />
  );
}
