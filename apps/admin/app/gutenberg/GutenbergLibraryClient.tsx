"use client";

import { useEffect, useId, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ACTIVE_JOB_KEY = "readup:gutenberg-library-job:v1";

type Job = {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  requested_count: number;
  saved_count: number;
  skipped_count: number;
  failed_count: number;
  last_error: string | null;
  busy?: boolean;
  retry_after_ms?: number;
};

type SourceBook = {
  gutenbergId: number;
  title: string;
  authors: { name?: string }[];
  bookshelves: string[];
  textStatus: string;
  textLength: number | null;
  textError: string | null;
};

type Library = { total: number; ready: number; books: SourceBook[] };

async function jsonOrError<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status}).`);
  return body as T;
}

export function GutenbergLibraryClient() {
  const countId = useId();
  const genreId = useId();
  const authorId = useId();
  const [count, setCount] = useState(51);
  const [genre, setGenre] = useState("");
  const [author, setAuthor] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [library, setLibrary] = useState<Library | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshLibrary() {
    setLibrary(await jsonOrError<Library>(await fetch("/api/gutenberg-library", { cache: "no-store" })));
  }

  useEffect(() => {
    void (async () => {
      try {
        await refreshLibrary();
        const jobId = window.localStorage.getItem(ACTIVE_JOB_KEY);
        if (jobId) {
          const savedJob = await jsonOrError<Job>(await fetch(`/api/gutenberg-library/${jobId}`));
          setJob(savedJob);
          if (savedJob.status === "succeeded") window.localStorage.removeItem(ACTIVE_JOB_KEY);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load Gutenberg library.");
      }
    })();
  }, []);

  async function run(jobId: string) {
    setIsRunning(true);
    setError(null);
    try {
      while (true) {
        const next = await jsonOrError<Job>(await fetch(`/api/gutenberg-library/${jobId}/advance`, {
          method: "POST", cache: "no-store",
        }));
        setJob(next);
        if (next.status === "succeeded") {
          window.localStorage.removeItem(ACTIVE_JOB_KEY);
          await refreshLibrary();
          return;
        }
        if (next.status === "failed") {
          throw new Error(next.last_error ?? "Collection stopped. You can resume it.");
        }
        await new Promise((resolve) => setTimeout(
          resolve,
          next.busy ? Math.min(Math.max(next.retry_after_ms ?? 1000, 500), 30_000) : 250,
        ));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Collection failed.");
      await refreshLibrary().catch(() => undefined);
    } finally {
      setIsRunning(false);
    }
  }

  async function start() {
    if (isRunning) return;
    setError(null);
    setIsRunning(true);
    try {
      const result = await jsonOrError<{ job_id: string }>(await fetch("/api/gutenberg-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, genre: genre.trim() || undefined, author: author.trim() || undefined }),
      }));
      window.localStorage.setItem(ACTIVE_JOB_KEY, result.job_id);
      await run(result.job_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start collection.");
      setIsRunning(false);
    }
  }

  return (
    <section className="rounded-card border border-border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-foreground">Save Gutenberg source books</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Save catalog metadata, authors, bookshelves, and cleaned text to the private database.
        These books are not published or processed with AI.
      </p>

      <FieldGroup className="mt-5 max-w-xl gap-4">
        <Field>
          <FieldLabel htmlFor={countId}>New books to save</FieldLabel>
          <Input id={countId} type="number" min={1} max={100} value={count}
            disabled={isRunning} onChange={(e) => setCount(Number(e.target.value))} />
          <FieldDescription>1–100 per collection job. Existing saved books are skipped.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={genreId}>Genre or subject</FieldLabel>
          <Input id={genreId} value={genre} disabled={isRunning}
            placeholder="Optional" onChange={(e) => setGenre(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor={authorId}>Author</FieldLabel>
          <Input id={authorId} value={author} disabled={isRunning}
            placeholder="Optional" onChange={(e) => setAuthor(e.target.value)} />
        </Field>
      </FieldGroup>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" disabled={isRunning || !Number.isInteger(count) || count < 1 || count > 100}
          onClick={() => void start()}>
          {isRunning ? "Saving books…" : "Fetch and save books"}
        </Button>
        {job && job.status !== "succeeded" && !isRunning ? (
          <Button type="button" variant="outline" onClick={() => void run(job.id)}>Resume collection</Button>
        ) : null}
      </div>

      {job ? (
        <p className="mt-4 text-sm text-muted-foreground" role="status">
          {job.saved_count}/{job.requested_count} saved · {job.skipped_count} skipped · {job.failed_count} failed
          {job.status === "succeeded" ? " · Finished" : isRunning ? " · Working; keep this tab open" : " · Paused"}
          {job.last_error ? ` · ${job.last_error}` : ""}
        </p>
      ) : null}
      {error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Collection error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-foreground">Saved source library</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => void refreshLibrary().catch((err) => setError(String(err)))}>
          Refresh
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {library ? `${library.ready} ready of ${library.total} stored books` : "Loading books…"}
      </p>
      <div className="mt-4 max-h-[440px] overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Bookshelves</TableHead>
              <TableHead>Text</TableHead>
              <TableHead>ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {library?.books.length ? library.books.map((book) => (
              <TableRow key={book.gutenbergId}>
                <TableCell className="max-w-[250px] truncate font-medium" title={book.title}>{book.title}</TableCell>
                <TableCell className="max-w-[180px] truncate" title={book.authors.map((a) => a.name).join(", ")}>
                  {book.authors.map((a) => a.name).join(", ") || "—"}
                </TableCell>
                <TableCell className="max-w-[220px] truncate" title={book.bookshelves.join(", ")}>
                  {book.bookshelves.join(", ") || "—"}
                </TableCell>
                <TableCell title={book.textError ?? undefined}>
                  <Badge variant={book.textStatus === "ready" ? "default" : "destructive"}>
                    {book.textStatus === "ready" ? `${book.textLength?.toLocaleString() ?? 0} chars` : book.textStatus}
                  </Badge>
                </TableCell>
                <TableCell>{book.gutenbergId}</TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={5} className="h-20 text-muted-foreground">No source books yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {library && library.total > library.books.length ? (
        <p className="mt-2 text-xs text-muted-foreground">Showing the 100 most recently saved books.</p>
      ) : null}
    </section>
  );
}
