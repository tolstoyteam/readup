import "server-only";

import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  bookWorksTable,
  booksTable,
  generationJobsTable,
  gutenbergSourceBooksTable,
} from "@readup/db";
import { db } from "@/db/client";
import type { BookGenerationJobPayload } from "@/lib/book-generation/types";

export const SOURCE_PAGE_SIZE = 50;

export type SourceAppFilter = "all" | "waiting" | "published";

export async function listSavedSourceBooks(args: {
  page: number;
  query: string;
  appFilter: SourceAppFilter;
}) {
  const book = gutenbergSourceBooksTable;
  const publishedExists = sql`exists (
    select 1 from public.book_works w
    join public.books b on b.work_id = w.id
    where w.gutenberg_id = ${book.gutenbergId} and b.status = 'published'
  )`;
  const search = args.query.trim();
  const conditions = [];
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(or(
      ilike(book.title, pattern),
      sql`${book.authors}::text ilike ${pattern}`,
      sql`${book.gutenbergId}::text like ${pattern}`,
    ));
  }
  if (args.appFilter === "waiting") conditions.push(sql`not ${publishedExists}`);
  if (args.appFilter === "published") conditions.push(publishedExists);
  const where = conditions.length ? and(...conditions) : undefined;

  const [counts, rows] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(book).where(where),
    db.select({
      gutenbergId: book.gutenbergId,
      title: book.title,
      authors: book.authors,
      bookshelves: book.bookshelves,
      textStatus: book.textStatus,
      textLength: book.textLength,
      textError: book.textError,
      updatedAt: book.updatedAt,
      appBookId: sql<number | null>`(
        select b.id from public.book_works w
        join public.books b on b.work_id = w.id
        where w.gutenberg_id = "gutenberg_source_books"."gutenberg_id" and b.status = 'published'
        order by case when b.language = 'en' then 0 else 1 end, b.id
        limit 1
      )`,
    }).from(book).where(where)
      .orderBy(desc(book.updatedAt), desc(book.gutenbergId))
      .limit(SOURCE_PAGE_SIZE)
      .offset((args.page - 1) * SOURCE_PAGE_SIZE),
  ]);

  return {
    page: args.page,
    page_size: SOURCE_PAGE_SIZE,
    total: counts[0]?.total ?? 0,
    books: rows.map((row) => ({
      ...row,
      appStatus: row.appBookId ? "published" : "waiting",
    })),
  };
}

export async function enqueueSavedSourceBooks(ids: number[]) {
  return db.transaction(async (tx) => {
    const sources = await tx.select({
      gutenbergId: gutenbergSourceBooksTable.gutenbergId,
      title: gutenbergSourceBooksTable.title,
      gutenbergUrl: gutenbergSourceBooksTable.gutenbergUrl,
      textStatus: gutenbergSourceBooksTable.textStatus,
      textLength: gutenbergSourceBooksTable.textLength,
    }).from(gutenbergSourceBooksTable)
      .where(inArray(gutenbergSourceBooksTable.gutenbergId, ids));
    const sourceById = new Map(sources.map((source) => [source.gutenbergId, source]));

    const results: Array<{
      gutenberg_id: number;
      status: "started" | "existing" | "already_in_app" | "text_unavailable" | "not_found";
      job_id: string | null;
      work_id: string | null;
    }> = [];

    for (const id of ids) {
      const source = sourceById.get(id);
      if (!source) {
        results.push({ gutenberg_id: id, status: "not_found", job_id: null, work_id: null });
        continue;
      }
      if (source.textStatus !== "ready" || !source.textLength) {
        results.push({ gutenberg_id: id, status: "text_unavailable", job_id: null, work_id: null });
        continue;
      }

      await tx.insert(bookWorksTable).values({ gutenbergId: id }).onConflictDoNothing();
      const [work] = await tx.select({ id: bookWorksTable.id }).from(bookWorksTable)
        .where(eq(bookWorksTable.gutenbergId, id)).for("update").limit(1);
      if (!work) throw new Error(`Could not create work for Gutenberg #${id}.`);

      const [published] = await tx.select({ id: booksTable.id }).from(booksTable)
        .where(and(eq(booksTable.workId, work.id), eq(booksTable.status, "published"))).limit(1);
      if (published) {
        results.push({ gutenberg_id: id, status: "already_in_app", job_id: null, work_id: work.id });
        continue;
      }

      const [existing] = await tx.select({
        id: generationJobsTable.id,
        status: generationJobsTable.status,
        payload: generationJobsTable.payload,
      })
        .from(generationJobsTable)
        .where(and(eq(generationJobsTable.workId, work.id), eq(generationJobsTable.type, "book_generation")))
        .orderBy(desc(generationJobsTable.createdAt)).limit(1);
      const existingSourceId = (existing?.payload as Partial<BookGenerationJobPayload> | undefined)?.gutenberg_source_id;
      if (existing && (existing.status === "queued" || existing.status === "running" ||
        (existing.status === "failed" && existingSourceId === id))) {
        results.push({ gutenberg_id: id, status: "existing", job_id: existing.id, work_id: work.id });
        continue;
      }

      const payload: BookGenerationJobPayload = {
        workflow_settings: {
          topic: source.title.slice(0, 200),
          reading_level: "advanced",
          length: "long",
          languages: ["en", "ru"],
          include_quiz: true,
        },
        gutenberg_source_id: id,
        gutenberg: { id, url: source.gutenbergUrl ?? `https://www.gutenberg.org/ebooks/${id}`, title: source.title },
        progress: { step: "queued", message: "Waiting to generate from saved Gutenberg text..." },
        heartbeat_at: new Date().toISOString(),
        result: null,
      };
      const [job] = await tx.insert(generationJobsTable).values({
        workId: work.id,
        type: "book_generation",
        payload: payload as unknown as Record<string, unknown>,
      }).returning({ id: generationJobsTable.id });
      if (!job) throw new Error(`Could not queue Gutenberg #${id}.`);
      results.push({ gutenberg_id: id, status: "started", job_id: job.id, work_id: work.id });
    }

    return results;
  });
}
