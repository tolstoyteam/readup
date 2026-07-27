# Admin app (`@readup/admin`)

Next.js book upload and management panel.

## Dev

From monorepo root:

```bash
pnpm install
pnpm admin
```

Or:

```bash
pnpm --filter @readup/admin dev
```

## Shared database

Schema, migrations, and Drizzle config live in `packages/db` (`@readup/db`).

- Import types/tables: `import { booksTable } from "@readup/db"`
- DB client (admin-only): `import { db } from "@/db/client"`
- Migrations: `pnpm db:generate` / `pnpm db:migrate` from repo root

## Env

Uses root `.env` or `apps/admin/.env.local`.

Admin needs:

```bash
DATABASE_URL=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_BOOK_COVERS_BUCKET=...
```

`DIRECT_URL` is optional and only needed for migrations. `SUPABASE_BOOK_AUDIO_BUCKET`
is optional for generated TTS storage.

## Book generation on Vercel

AI book generation runs as a **background job** (`generation_jobs`) started from
`POST /api/books/generate-workflow` (returns `202` + `job_id`). The admin UI polls
`GET /api/generation-jobs/[id]` for progress.

- Set `maxDuration` on [`app/api/books/generate-workflow/route.ts`](app/api/books/generate-workflow/route.ts)
  as high as your Vercel plan allows (default in repo: 800 seconds).
- Enable **Fluid Compute** on the admin project for longer, more reliable function runs.
- If jobs remain `running` after failures, check function logs for timeouts and query
  `generation_jobs` where `status = 'running'` and `updated_at` is stale.

## Auth

The admin app uses Supabase Auth for sign-in and a server-side allowlist for
authorization. Run `packages/db/sql/supabase-admin-auth.sql` in Supabase SQL
Editor, then add allowed admin users:

```sql
insert into public.admin_users (user_id)
values ('00000000-0000-0000-0000-000000000000')
on conflict (user_id) do nothing;
```

Google sign-in must also be enabled in Supabase Dashboard under
Authentication → Providers → Google, and the deployed admin URL must be allowed
as an auth redirect URL. The callback path is:

```text
https://your-admin-domain.com/auth/callback
```
