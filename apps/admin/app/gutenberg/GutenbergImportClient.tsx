"use client";

import { useId, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ACTIVE_IMPORT_JOB_KEY = "readup:gutenberg-import-job:v1";

type ImportItem = {
  id: string;
  gutenberg_id: number;
  title: string;
  author: string;
  status: string;
  work_id: string | null;
  error: string | null;
};

type ImportJobResponse = {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  requested_count: number;
  filters: { genre?: string; author?: string; year?: number };
  progress: {
    requested: number;
    imported: number;
    skipped: number;
    failed: number;
    processing: number;
  };
  last_error: string | null;
  items: ImportItem[];
  busy?: boolean;
  retry_after_ms?: number;
  terminal?: boolean;
  reset_count?: number;
};

const STATUS_LABELS: Record<string, string> = {
  waiting: "Waiting",
  fetching: "Fetching",
  fetched: "Fetched",
  generating_english: "Generating English",
  generating_russian: "Generating Russian",
  generating_english_tts: "Generating English TTS",
  generating_russian_tts: "Generating Russian TTS",
  saving: "Saving",
  completed: "Completed",
  skipped: "Skipped",
  failed: "Failed",
};

function saveActiveImportJob(jobId: string) {
  try {
    window.localStorage.setItem(ACTIVE_IMPORT_JOB_KEY, jobId);
  } catch {
    // Resume still works within the current tab.
  }
}

function loadActiveImportJob(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_IMPORT_JOB_KEY);
  } catch {
    return null;
  }
}

function clearActiveImportJob() {
  try {
    window.localStorage.removeItem(ACTIVE_IMPORT_JOB_KEY);
  } catch {
    // Cleared from component state regardless.
  }
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "failed") return "destructive";
  if (status === "skipped") return "secondary";
  return "outline";
}

export function GutenbergImportClient() {
  const countId = useId();
  const genreId = useId();
  const authorId = useId();
  const yearId = useId();

  const [count, setCount] = useState(1);
  const [genre, setGenre] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [job, setJob] = useState<ImportJobResponse | null>(null);
  const [resumableJobId, setResumableJobId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : loadActiveImportJob(),
  );

  async function runImportLoop(jobId: string) {
    saveActiveImportJob(jobId);
    setIsRunning(true);
    setError(null);

    try {
      while (true) {
        const res = await fetch(`/api/gutenberg-imports/${jobId}/advance`, {
          method: "POST",
          cache: "no-store",
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `Import step failed. Job id: ${jobId}.`);
        }
        const data = (await res.json()) as ImportJobResponse;
        setJob(data);

        if (data.status === "succeeded" || data.terminal) {
          clearActiveImportJob();
          setResumableJobId(null);
          return;
        }
        if (data.status === "failed") {
          throw new Error(data.last_error ?? "Import job failed.");
        }

        const processingStatuses = new Set([
          "waiting",
          "fetching",
          "fetched",
          "generating_english",
          "generating_russian",
          "generating_english_tts",
          "generating_russian_tts",
          "saving",
        ]);
        const active = data.items.find((item) => processingStatuses.has(item.status));
        const gutenbergHeavy =
          active?.status === "waiting" ||
          active?.status === "fetching" ||
          active?.status === "fetched" ||
          !active;

        if (data.busy) {
          // Honor server rate-limit / lease delays (up to 30s).
          await wait(Math.min(Math.max(data.retry_after_ms ?? 1000, 500), 30_000));
        } else if (gutenbergHeavy) {
          await wait(800);
        } else {
          await wait(250);
        }
      }
    } finally {
      setIsRunning(false);
    }
  }

  async function startImport() {
    if (isRunning) return;
    setError(null);
    setIsRunning(true);
    try {
      const body: Record<string, unknown> = {
        count: Math.min(50, Math.max(1, Math.floor(count) || 1)),
      };
      if (genre.trim()) body.genre = genre.trim();
      if (author.trim()) body.author = author.trim();
      if (year.trim()) {
        const y = Number(year);
        if (!Number.isFinite(y)) {
          throw new Error("Year must be a number (author-alive year).");
        }
        body.year = Math.trunc(y);
      }

      const res = await fetch("/api/gutenberg-imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to start import.");
      }
      const data = (await res.json()) as { job_id: string };
      await runImportLoop(data.job_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
      setIsRunning(false);
    }
  }

  async function resumeImport() {
    if (isRunning) return;
    const jobId = resumableJobId ?? loadActiveImportJob();
    if (!jobId) return;
    setError(null);
    try {
      await runImportLoop(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resume failed.");
    }
  }

  async function retryFailed() {
    if (!job?.id || isRunning) return;
    setError(null);
    setIsRunning(true);
    try {
      const res = await fetch(`/api/gutenberg-imports/${job.id}/retry-failed`, {
        method: "POST",
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to retry.");
      }
      const data = (await res.json()) as ImportJobResponse;
      setJob(data);
      await runImportLoop(job.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed.");
      setIsRunning(false);
    }
  }

  const progress = job?.progress;
  const failedCount = progress?.failed ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-card border border-border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">Import books from Gutenberg</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generated settings are fixed: Advanced reading level, Long length, English + Russian,
          quizzes enabled.
        </p>

        <FieldGroup className="mt-5 max-w-xl gap-4">
          <Field>
            <FieldLabel htmlFor={countId}>Number of books</FieldLabel>
            <Input
              id={countId}
              type="number"
              min={1}
              max={50}
              value={count}
              disabled={isRunning}
              onChange={(e) => setCount(Number(e.target.value))}
            />
            <FieldDescription>Required. Between 1 and 50 (default 1).</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor={genreId}>Genre</FieldLabel>
            <Input
              id={genreId}
              value={genre}
              disabled={isRunning}
              placeholder="e.g. Philosophy, Children, Adventure"
              onChange={(e) => setGenre(e.target.value)}
            />
            <FieldDescription>Optional. Matched against Gutenberg subjects/bookshelves.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor={authorId}>Author</FieldLabel>
            <Input
              id={authorId}
              value={author}
              disabled={isRunning}
              placeholder="e.g. Jane Austen"
              onChange={(e) => setAuthor(e.target.value)}
            />
            <FieldDescription>Optional.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor={yearId}>Author year</FieldLabel>
            <Input
              id={yearId}
              type="number"
              value={year}
              disabled={isRunning}
              placeholder="e.g. 1812"
              onChange={(e) => setYear(e.target.value)}
            />
            <FieldDescription>
              Optional. Filters authors alive in that year (Gutenberg API limitation — not
              original publication year).
            </FieldDescription>
          </Field>
        </FieldGroup>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" disabled={isRunning} onClick={() => void startImport()}>
            {isRunning ? "Importing…" : "Fetch & Generate Books"}
          </Button>
          {resumableJobId && !isRunning ? (
            <Button type="button" variant="outline" onClick={() => void resumeImport()}>
              Resume import
            </Button>
          ) : null}
          {job && failedCount > 0 && !isRunning ? (
            <Button type="button" variant="outline" onClick={() => void retryFailed()}>
              Retry failed ({failedCount})
            </Button>
          ) : null}
        </div>

        {error ? (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Import error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </section>

      {job ? (
        <section className="rounded-card border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Import progress</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Job {job.id.slice(0, 8)}… · Status: {job.status}
                {job.last_error ? ` · ${job.last_error}` : ""}
              </p>
            </div>
            {isRunning ? (
              <p className="text-sm text-muted-foreground">Working — keep this page open.</p>
            ) : null}
          </div>

          {progress ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Stat label="Requested" value={progress.requested} />
              <Stat label="Imported" value={progress.imported} />
              <Stat label="Skipped" value={progress.skipped} />
              <Stat label="Processing" value={progress.processing} />
              <Stat label="Failed" value={progress.failed} />
            </div>
          ) : null}

          <div className="mt-5 min-w-0 overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Gutenberg ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {job.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-muted-foreground">
                      Waiting for candidates…
                    </TableCell>
                  </TableRow>
                ) : (
                  job.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-[220px] truncate font-medium">
                        {item.title}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-muted-foreground">
                        {item.author}
                      </TableCell>
                      <TableCell>{item.gutenberg_id}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(item.status)}>
                          {STATUS_LABELS[item.status] ?? item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                        {item.error ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
