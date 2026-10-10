import { drizzle } from "drizzle-orm/postgres-js";
import { normalizeDatabaseUrl } from "@readup/db/database-url";
import * as schema from "@readup/db/schema";
import postgres from "postgres";

// Prefer Supabase transaction pooler (:6543) in DATABASE_URL — session :5432 is often
// blocked or reset under VPN. Reserve DATABASE_DIRECT_URL for drizzle-kit only
// (direct db.* hosts are frequently IPv6-only).
const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const normalized = normalizeDatabaseUrl(url);

const client = postgres(normalized, {
  max: 1,
  connect_timeout: 30,
  // Close idle sockets before VPN/LB resets them; recycle long-lived connections.
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  keep_alive: 10,
  // Required for transaction pooler (:6543); harmless on session pooler.
  prepare: false,
});

export const db = drizzle(client, { schema });
