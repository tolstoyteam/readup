import { config } from "dotenv";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: path.join(root, ".env"), quiet: true });
const connection = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connection) throw new Error("DIRECT_URL or DATABASE_URL required");
const sql = postgres(connection, { max: 1, connect_timeout: 10 });
const migration = readFileSync(path.join(root, "packages/db/drizzle/0021_onboarding_answers.sql"), "utf8");

// Deliberately roll back. This exercises the real database roles and auth.uid()
// without deploying the migration or changing any account data.
try {
  await sql.begin(async (tx) => {
    const users = await tx`select id from auth.users order by id limit 2`;
    if (users.length < 2) throw new Error("Two Auth users are required for RLS verification");
    const [own, other] = users.map((user) => user.id);
    await tx.unsafe(migration);
    const backfill = await tx`select state from public.user_onboarding where user_id = ${own}`;
    if (backfill[0]?.state !== "legacy") throw new Error("Existing Auth user was not backfilled as legacy");

    await tx.unsafe("set local role authenticated");
    await tx`select set_config('request.jwt.claim.sub', ${own}, true)`;
    const ownRows = await tx`select user_id from public.user_onboarding where user_id = ${own}`;
    const otherRows = await tx`select user_id from public.user_onboarding where user_id = ${other}`;
    if (ownRows.length !== 1 || otherRows.length !== 0) throw new Error("SELECT RLS failed");
    const ownUpdate = await tx`update public.user_onboarding set challenge = 'rls-test' where user_id = ${own} returning user_id`;
    const otherUpdate = await tx`update public.user_onboarding set challenge = 'rls-test' where user_id = ${other} returning user_id`;
    if (ownUpdate.length !== 1 || otherUpdate.length !== 0) throw new Error("UPDATE RLS failed");

    await tx.unsafe("reset role");
    await tx`delete from public.user_onboarding where user_id in (${own}, ${other})`;
    await tx.unsafe("set local role authenticated");
    await tx`insert into public.user_onboarding (user_id) values (${own})`;
    let crossInsertDenied = false;
    await tx.unsafe("savepoint cross_insert");
    try {
      await tx`insert into public.user_onboarding (user_id) values (${other})`;
    } catch {
      crossInsertDenied = true;
      await tx.unsafe("rollback to savepoint cross_insert");
    }
    if (!crossInsertDenied) throw new Error("INSERT RLS failed");
    console.log("Onboarding migration and owner-only RLS: passed (transaction rolled back)");
    throw new Error("ROLLBACK_TEST_TRANSACTION");
  });
} catch (error) {
  if (error.message !== "ROLLBACK_TEST_TRANSACTION") throw error;
} finally {
  await sql.end({ timeout: 5 });
}
