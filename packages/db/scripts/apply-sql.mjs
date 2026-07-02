import { config } from "dotenv";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(rootDir, "..");
const repoRoot = path.resolve(packageDir, "../..");

config({ path: path.resolve(repoRoot, ".env") });
config({ path: path.resolve(repoRoot, "apps/admin/.env") });

const rawUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!rawUrl) {
  console.error("Set DIRECT_URL or DATABASE_URL in the repo root .env");
  process.exit(1);
}

function normalizeDatabaseUrl(raw) {
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

const DRIZZLE_MIGRATIONS = [
  "0006_multilingual_book_architecture.sql",
  "0007_work_library_consolidation.sql",
  "0008_generation_job_types.sql",
  "0009_user_quotes.sql",
];

const SQL_FILES = [
  "supabase-engagement-cleanup.sql",
  "supabase-profiles-library.sql",
  "supabase-books-anon-select.sql",
  "supabase-content-read.sql",
  "supabase-engagement-rls.sql",
  "supabase-quotes-rls.sql",
  "supabase-views.sql",
  "supabase-rpcs.sql",
  "supabase-achievements-seed.sql",
  "supabase-book-audio-storage-anon-read.sql",
];

const url = normalizeDatabaseUrl(rawUrl);
const sql = postgres(url, { max: 1, connect_timeout: 30 });

async function main() {
  for (const file of DRIZZLE_MIGRATIONS) {
    const filePath = path.resolve(packageDir, "drizzle", file);
    const contents = readFileSync(filePath, "utf8");
    process.stdout.write(`Applying drizzle/${file}... `);
    await sql.unsafe(contents);
    process.stdout.write("ok\n");
  }

  for (const file of SQL_FILES) {
    const filePath = path.resolve(packageDir, "sql", file);
    const contents = readFileSync(filePath, "utf8");
    process.stdout.write(`Applying ${file}... `);
    await sql.unsafe(contents);
    process.stdout.write("ok\n");
  }

  const checks = await sql`
    select routine_name
    from information_schema.routines
    where routine_schema = 'public'
      and routine_name in (
        'record_reading_session',
        'toggle_work_save',
        'complete_quiz',
        'get_recommended_books'
      )
  `;

  console.log(
    `Verified RPCs: ${checks.map((row) => row.routine_name).join(", ") || "none"}`,
  );

  const sessionRpcs = await sql`
    select pg_get_function_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'record_reading_session'
    order by p.oid
  `;

  if (sessionRpcs.length === 0) {
    console.error("ERROR: record_reading_session not found after apply.");
    process.exit(1);
  }

  for (const row of sessionRpcs) {
    console.log(`record_reading_session: ${row.args}`);
  }

  const hasActivityDate = sessionRpcs.some((row) =>
    String(row.args).includes("p_activity_date"),
  );
  if (hasActivityDate) {
    console.error(
      "ERROR: remediation record_reading_session (p_activity_date) still present. Re-run apply or check cleanup.",
    );
    process.exit(1);
  }

  if (sessionRpcs.length > 1) {
    console.warn(
      `WARN: ${sessionRpcs.length} record_reading_session overloads found; expected one 7-parameter version.`,
    );
  }

  const hasStableIdParams = sessionRpcs.some((row) =>
    String(row.args).includes("p_chapter_stable_id"),
  );
  if (!hasStableIdParams && sessionRpcs.length > 0) {
    console.error(
      "ERROR: record_reading_session missing p_chapter_stable_id — expected work-level 7-parameter RPC.",
    );
    process.exit(1);
  }

  const remediationTriggers = await sql`
    select tgname
    from pg_trigger
    where tgname in (
      'trg_user_library_protect_progress',
      'trg_profiles_protect_engagement_stats'
    )
      and not tgisinternal
  `;

  if (remediationTriggers.length > 0) {
    console.error(
      `ERROR: remediation triggers still present: ${remediationTriggers.map((r) => r.tgname).join(", ")}`,
    );
    process.exit(1);
  }

  console.log("Engagement cleanup verification: ok");
}

main()
  .then(async () => {
    await sql.end({ timeout: 5 });
  })
  .catch(async (error) => {
    console.error("\nFailed:", error.message ?? error);
    await sql.end({ timeout: 5 });
    process.exit(1);
  });
