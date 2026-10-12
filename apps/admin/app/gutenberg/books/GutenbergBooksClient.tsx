"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ACTIVE_QUEUE_KEY = "readup:gutenberg-app-queue:v1";

type AppFilter = "all" | "waiting" | "published";
type SourceBook = {
  gutenbergId: number;
  title: string;
  authors: { name?: string }[];
  bookshelves: string[];
  textStatus: string;
  textLength: number | null;
  textError: string | null;
  appBookId: number | null;
  appStatus: "waiting" | "published";
};
type BookPage = { page: number; page_size: number; total: number; books: SourceBook[] };
type LoadedBookPage = { key: string; page: BookPage };
type Enqueued = {
  gutenberg_id: number;
  status: "started" | "existing" | "already_in_app" | "text_unavailable" | "not_found";
  job_id: string | null;
};
type QueueItem = { gutenberg_id: number; job_id: string };
type GenerationResponse = {
  status: "queued" | "running" | "succeeded" | "failed";
  last_error: string | null;
  progress?: { message?: string } | null;
  busy?: boolean;
  retry_after_ms?: number;
};

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status}).`);
  return body as T;
}

function saveQueue(queue: QueueItem[]) {
  try {
    if (queue.length) window.localStorage.setItem(ACTIVE_QUEUE_KEY, JSON.stringify(queue));
    else window.localStorage.removeItem(ACTIVE_QUEUE_KEY);
  } catch {
    // The current tab can still finish the queue.
  }
}

function loadQueue(): QueueItem[] {
  try {
    const raw = window.localStorage.getItem(ACTIVE_QUEUE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is QueueItem =>
      !!item && typeof item === "object" &&
      typeof item.gutenberg_id === "number" && typeof item.job_id === "string",
    );
  } catch {
    return [];
  }
}

export function GutenbergBooksClient() {
  const [page, setPage] = useState(1);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AppFilter>("all");
  const [refresh, setRefresh] = useState(0);
  const [loaded, setLoaded] = useState<LoadedBookPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestKey = new URLSearchParams({ page: String(page), q: query, app_status: filter, refresh: String(refresh) }).toString();
  const data = loaded?.key === requestKey ? loaded.page : null;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setQueue(loadQueue()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await readResponse<BookPage>(await fetch(
          `/api/gutenberg-source-books?${requestKey}`, { cache: "no-store" },
        ));
        if (!cancelled) {
          setLoaded({ key: requestKey, page: result });
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load saved books.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [requestKey]);

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuery(queryInput.trim());
  }

  async function processQueue(items: QueueItem[]) {
    if (running || items.length === 0) return;
    setRunning(true);
    setError(null);
    saveQueue(items);
    setQueue(items);
    const failed: QueueItem[] = [];

    try {
      for (const [index, item] of items.entries()) {
        setMessage(`Book ${index + 1}/${items.length} · Gutenberg #${item.gutenberg_id}`);
        try {
          while (true) {
            const result = await readResponse<GenerationResponse>(await fetch(
              `/api/generation-jobs/${item.job_id}/advance`,
              { method: "POST", cache: "no-store" },
            ));
            if (result.progress?.message) {
              setMessage(`Book ${index + 1}/${items.length} · ${result.progress.message}`);
            }
            if (result.status === "succeeded") break;
            if (result.status === "failed") {
              throw new Error(result.last_error ?? `Generation failed for Gutenberg #${item.gutenberg_id}.`);
            }
            await new Promise((resolve) => setTimeout(
              resolve,
              result.busy ? Math.min(Math.max(result.retry_after_ms ?? 1000, 500), 5000) : 150,
            ));
          }
        } catch (err) {
          failed.push(item);
          setError(err instanceof Error ? err.message : `Could not process Gutenberg #${item.gutenberg_id}.`);
        }
        const remaining = [...failed, ...items.slice(index + 1)];
        saveQueue(remaining);
        setQueue(remaining);
        setRefresh((value) => value + 1);
      }
      setMessage(failed.length
        ? `${items.length - failed.length} completed · ${failed.length} need retry.`
        : `${items.length} book${items.length === 1 ? "" : "s"} published.`);
    } finally {
      setRunning(false);
    }
  }

  async function addBooks(ids: number[]) {
    if (running || ids.length === 0) return;
    setRunning(true);
    setError(null);
    try {
      const result = await readResponse<{ items: Enqueued[] }>(await fetch("/api/gutenberg-source-books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      }));
      setSelected((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      const jobs = result.items
        .filter((item): item is Enqueued & { job_id: string } => !!item.job_id)
        .map((item) => ({ gutenberg_id: item.gutenberg_id, job_id: item.job_id }));
      if (!jobs.length) {
        setMessage("No generation jobs started. Check text and app status.");
        setRefresh((value) => value + 1);
        return;
      }
      setRunning(false);
      await processQueue(jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add books to the app.");
    } finally {
      setRunning(false);
    }
  }

  const eligible = data?.books.filter((book) => book.textStatus === "ready" && book.appStatus === "waiting") ?? [];
  const allPageSelected = eligible.length > 0 && eligible.every((book) => selected.has(book.gutenbergId));
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.page_size ?? 50)));

  return (
    <section className="rounded-card border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Source books</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} matching books` : "Loading books…"} · Select books across pages for one batch.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Generate with AI creates a summary, cover, English and Russian editions, quizzes, and audio, then publishes the finished book.
            Keep this page open while a batch runs; unfinished jobs can be resumed.
          </p>
        </div>
        <Button nativeButton={false} variant="outline" render={<Link href="/gutenberg" />}>Collect more books</Button>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <form onSubmit={onSearch} className="flex min-w-[240px] flex-1 gap-2">
          <Input aria-label="Search saved books" value={queryInput} placeholder="Search title, author, or Gutenberg ID"
            onChange={(event) => setQueryInput(event.target.value)} />
          <Button type="submit" variant="outline">Search</Button>
        </form>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Status
          <select className="h-10 rounded-input border border-input bg-background px-3 text-foreground"
            value={filter} onChange={(event) => { setFilter(event.target.value as AppFilter); setPage(1); }}>
            <option value="all">All</option>
            <option value="waiting">Waiting</option>
            <option value="published">Published</option>
          </select>
        </label>
        <Button type="button" variant="outline" onClick={() => setRefresh((value) => value + 1)}>
          Refresh
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" disabled={running || selected.size === 0 || selected.size > 100}
          onClick={() => void addBooks([...selected])}>
          {running ? "Generating…" : `Generate selected with AI (${selected.size})`}
        </Button>
        {selected.size ? (
          <Button type="button" variant="ghost" disabled={running} onClick={() => setSelected(new Set())}>Clear selection</Button>
        ) : null}
        {queue.length && !running ? (
          <Button type="button" variant="outline" onClick={() => void processQueue(queue)}>
            Resume batch ({queue.length})
          </Button>
        ) : null}
        {selected.size > 100 ? <span className="text-sm text-destructive">Choose at most 100 books per batch.</span> : null}
      </div>

      {message ? <p className="mt-3 text-sm text-muted-foreground" role="status">{message}</p> : null}
      {error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Generation error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-lg border border-border">
        <Table className="table-fixed min-w-[1200px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[4%]">
                <input type="checkbox" aria-label="Select all eligible books on this page"
                  checked={allPageSelected} disabled={running || eligible.length === 0}
                  onChange={() => setSelected((current) => {
                    const next = new Set(current);
                    eligible.forEach((book) => {
                      if (allPageSelected) next.delete(book.gutenbergId);
                      else next.add(book.gutenbergId);
                    });
                    return next;
                  })} />
              </TableHead>
              <TableHead className="w-[31%]">Book</TableHead>
              <TableHead className="w-[16%]">Author</TableHead>
              <TableHead className="w-[14%]">Bookshelves</TableHead>
              <TableHead className="w-[10%]">Text</TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-[15%] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading || (!data && !error) ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Loading books…</TableCell></TableRow>
            ) : !data ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Could not load books.</TableCell></TableRow>
            ) : !data?.books.length ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No saved books match this view.</TableCell></TableRow>
            ) : data.books.map((book) => {
              const canAdd = book.textStatus === "ready" && book.appStatus === "waiting";
              const author = book.authors.map((item) => item.name).filter(Boolean).join(", ") || "Unknown";
              const appLabel = book.appStatus === "published" ? "Published" : "Waiting";
              return (
                <TableRow key={book.gutenbergId}>
                  <TableCell>
                    <input type="checkbox" aria-label={`Select ${book.title}`}
                      checked={selected.has(book.gutenbergId)} disabled={running || !canAdd}
                      onChange={() => toggle(book.gutenbergId)} />
                  </TableCell>
                  <TableCell>
                    <div className="truncate font-medium text-foreground" title={book.title}>{book.title}</div>
                    <div className="text-xs text-muted-foreground">Gutenberg #{book.gutenbergId}</div>
                  </TableCell>
                  <TableCell><div className="truncate" title={author}>{author}</div></TableCell>
                  <TableCell>
                    <div className="truncate" title={book.bookshelves.join(", ")}>
                      {book.bookshelves.join(", ") || "—"}
                    </div>
                  </TableCell>
                  <TableCell title={book.textError ?? undefined}>
                    {book.textStatus === "ready" ? `${(book.textLength ?? 0).toLocaleString()} chars` : "Unavailable"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={book.appStatus === "published" ? "default" : "outline"}>
                      {appLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {book.appBookId ? (
                      <Button nativeButton={false} size="sm" variant="outline" render={<Link href={`/books/${book.appBookId}/edit`} />}>
                        Edit
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled={running || !canAdd}
                        onClick={() => void addBooks([book.gutenbergId])}>
                        Generate with AI
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>Page {page} of {pageCount}</span>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={page <= 1 || loading}
            onClick={() => setPage((value) => value - 1)}>Previous</Button>
          <Button type="button" size="sm" variant="outline" disabled={page >= pageCount || loading}
            onClick={() => setPage((value) => value + 1)}>Next</Button>
        </div>
      </div>
    </section>
  );
}
