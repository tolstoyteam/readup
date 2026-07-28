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

AI book generation is a resumable sequence of bounded Vercel Function invocations:

1. `POST /api/books/generate-workflow` validates input, creates the work and
   `generation_jobs` row, then returns `202` + `job_id`.
2. The admin browser repeatedly calls
   `POST /api/generation-jobs/[id]/advance`.
3. Each call claims a short database lease and completes one durable step:
   English generation, one translation, one edition audio chunk, edition
   finalization, or job finalization.
4. Completed editions and audio chunks are stored immediately. A timed-out or
   interrupted job resumes from the first missing step instead of regenerating
   completed audio.

The advance route uses the Vercel Hobby-compatible 300-second maximum. Keep the
generation modal open while the browser advances the job. If the tab closes or a
step fails, open the modal again and use **Resume generation**; the job id is
stored locally in the admin browser.

`GET /api/generation-jobs/[id]` remains available for status inspection. Supabase
stores job state and audio files but does not execute the pipeline.

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
