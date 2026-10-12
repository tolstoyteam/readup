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

### Gutenberg import

Requires a RapidAPI subscription to **Project Gutenberg - Free Books API**
(host `project-gutenberg-free-books-api1.p.rapidapi.com`).

Do **not** point `GUTENBERG_API_HOST` at other Gutenberg products such as
`project-gutenberg-books-api.p.rapidapi.com` or `project-gutenberg-api.p.rapidapi.com`
— a host/key mismatch returns RapidAPI `API doesn't exists`.

```bash
GUTENBERG_API_KEY=...
# Optional; defaults to project-gutenberg-free-books-api1.p.rapidapi.com
GUTENBERG_API_HOST=project-gutenberg-free-books-api1.p.rapidapi.com
```

Never set these as `NEXT_PUBLIC_*`. Restart the admin server after changing them.

The client auto-detects whether the product mounts routes at `/books` or `/api/books`
and caches the working prefix.

Apply the schema migration if not already applied:

```bash
pnpm --filter @readup/db apply-drizzle 0022_gutenberg_import.sql
pnpm --filter @readup/db apply-drizzle 0024_gutenberg_source_library.sql
```

The Gutenberg admin page now has a **Save Gutenberg source books** workflow. It
stores full book metadata (including the raw API item), authors, bookshelves, and
cleaned text in private `gutenberg_source_books` rows. Collection jobs are
resumable and do not create app editions or invoke AI. Request up to 100 new books
per job; existing complete books are skipped. Keep the tab open while a job runs,
or resume it later from the same browser. The previous direct AI import remains
available in the collapsed section below the source library.

### Two-part cover builder

Apply the private design table and private `book-cover-sources` Storage bucket
before deploying the new cover generation code:

```bash
pnpm --filter @readup/db apply-drizzle 0023_book_cover_designs.sql
```

The existing `SUPABASE_BOOK_COVERS_BUCKET` holds only published, versioned
1000×1600 covers. The private `book-cover-sources` bucket keeps original square
illustration bytes. The admin work-cover builder opens from Gutenberg items and
the book edit form. Draft changes and source regeneration do not change the
mobile cover until **Publish cover** succeeds. Existing covers are left in place.

Versioned sources and retired covers are intentionally retained for recovery.
Inspect the 30-day cleanup candidates, then remove unreferenced files separately:

```bash
pnpm --filter @readup/admin cover:cleanup
pnpm --filter @readup/admin cover:cleanup --apply
```

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
