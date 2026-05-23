import { config } from "dotenv";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(rootDir, "..");
const repoRoot = path.resolve(packageDir, "../..");

config({ path: path.resolve(repoRoot, ".env") });

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

const SQL_FILES = [
  "supabase-profiles-library.sql",
  "supabase-books-anon-select.sql",
  "supabase-content-read.sql",
  "supabase-engagement-rls.sql",
  "supabase-views.sql",
  "supabase-rpcs.sql",
  "supabase-achievements-seed.sql",
  "supabase-book-audio-storage-anon-read.sql",
];

const url = normalizeDatabaseUrl(rawUrl);
const sql = postgres(url, { max: 1, connect_timeout: 30 });

async function main() {
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
        'complete_quiz',
        'get_recommended_books'
      )
  `;

  console.log(
    `Verified RPCs: ${checks.map((row) => row.routine_name).join(", ") || "none"}`,
  );
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
