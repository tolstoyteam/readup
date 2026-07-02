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
  console.error("Set DIRECT_URL or DATABASE_URL in .env (repo root or apps/admin/.env)");
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

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/apply-drizzle-file.mjs <filename.sql> [...]");
  process.exit(1);
}

const url = normalizeDatabaseUrl(rawUrl);
const sql = postgres(url, { max: 1, connect_timeout: 30 });

async function main() {
  for (const file of files) {
    const filePath = path.resolve(packageDir, "drizzle", file);
    const contents = readFileSync(filePath, "utf8");
    process.stdout.write(`Applying drizzle/${file}... `);
    await sql.unsafe(contents);
    process.stdout.write("ok\n");
  }
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
