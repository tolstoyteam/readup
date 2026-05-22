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

Uses root `.env` or `apps/admin/.env.local`. Admin needs `DATABASE_URL` (and optionally `DIRECT_URL` for migrations).
