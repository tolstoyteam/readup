/**
 * Dry run: pnpm cover:cleanup
 * Delete unreferenced versioned assets older than 30 days: pnpm cover:cleanup --apply
 * Never touches legacy works/{id}/cover.png objects.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../..", ".env") });
const databaseUrl = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const coversBucket = process.env.SUPABASE_BOOK_COVERS_BUCKET;
if (!databaseUrl || !supabaseUrl || !serviceKey || !coversBucket) {
  throw new Error("Database URL, Supabase URL, service key, and cover bucket are required.");
}

const apply = process.argv.includes("--apply");
const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
const sql = postgres(databaseUrl, { max: 1, connect_timeout: 30, prepare: false });
const storage = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
}).storage;

async function references() {
  const [designs, works, editions] = await Promise.all([
    sql<{ draft_source_path: string | null; published_source_path: string | null; published_path: string | null }[]>`
      select draft_source_path, published_source_path, published_path from public.book_cover_designs`,
    sql<{ cover_image_url: string | null }[]>`select cover_image_url from public.book_works`,
    sql<{ cover_image_url: string | null }[]>`select cover_image_url from public.books`,
  ]);
  return {
    sources: new Set(designs.flatMap((row) => [row.draft_source_path, row.published_source_path]).filter((path): path is string => Boolean(path))),
    covers: new Set([...designs.map((row) => row.published_path), ...works.map((row) => row.cover_image_url), ...editions.map((row) => row.cover_image_url)].filter((path): path is string => Boolean(path))),
  };
}

async function listFiles(bucket: string, prefix = "works"): Promise<Array<{ path: string; createdAt: string }>> {
  const files: Array<{ path: string; createdAt: string }> = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await storage.from(bucket).list(prefix, { limit: 100, offset });
    if (error) throw error;
    for (const item of data ?? []) {
      const path = `${prefix}/${item.name}`;
      if (item.id === null) files.push(...await listFiles(bucket, path));
      else if (item.created_at) files.push({ path, createdAt: item.created_at });
    }
    if (!data || data.length < 100) break;
  }
  return files;
}

try {
  const first = await references();
  const candidates = [
    { bucket: "book-cover-sources", paths: await listFiles("book-cover-sources"), refs: first.sources, pattern: /^works\/[^/]+\/sources\/[^/]+\.(png|jpg|webp)$/ },
    { bucket: coversBucket, paths: await listFiles(coversBucket), refs: first.covers, pattern: /^works\/[^/]+\/covers\/[^/]+\.(png|jpeg|svg)$/ },
  ].flatMap(({ bucket, paths, refs, pattern }) => paths
    .filter(({ path, createdAt }) => pattern.test(path) && Date.parse(createdAt) < cutoff && !refs.has(path))
    .map(({ path }) => ({ bucket, path })));

  console.log(`${apply ? "Deleting" : "Would delete"} ${candidates.length} unreferenced cover assets older than 30 days.`);
  for (const { bucket, path } of candidates) console.log(`${bucket}/${path}`);
  if (apply) {
    // Re-read references immediately before deletion to preserve assets published during listing.
    const current = await references();
    for (const { bucket, path } of candidates) {
      if ((bucket === coversBucket ? current.covers : current.sources).has(path)) continue;
      const { error } = await storage.from(bucket).remove([path]);
      if (error) throw new Error(`Could not delete ${bucket}/${path}: ${error.message}`);
    }
  }
} finally {
  await sql.end();
}
