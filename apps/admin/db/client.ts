import { drizzle } from "drizzle-orm/postgres-js";
import { normalizeDatabaseUrl } from "@readup/db/database-url";
import * as schema from "@readup/db/schema";
import postgres from "postgres";

// Use DATABASE_URL for the app (Supabase "Session pooler" on :5432 for IPv4 + long-lived
// Node). Reserve DIRECT_URL for drizzle-kit only — direct db.* URLs are often IPv6-only.
const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const normalized = normalizeDatabaseUrl(url);
// Transaction pooler (6543 / PgBouncer): disable prepared statements.
const isTransactionPooled = /:6543(\/|$|\?)/.test(normalized);

const client = postgres(normalized, {
  max: 1,
  connect_timeout: 30,
  ...(isTransactionPooled ? { prepare: false } : {}),
});

export const db = drizzle(client, { schema });
