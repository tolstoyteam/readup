# Readup Monorepo

Turborepo + pnpm monorepo for the Readup mobile app and Next.js admin panel.

## Structure

```
apps/
  mobile/     Expo React Native app (@readup/mobile)
  admin/      Next.js admin panel (@readup/admin) — copy your existing admin app here
packages/
  db/         Shared Drizzle schema, migrations, and Supabase SQL (@readup/db)
```

## Setup

```bash
pnpm install
```

Env vars live in the root `.env` file (shared by apps).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm mobile` | Start Expo dev server |
| `pnpm admin` | Start Next.js admin (after adding the admin app) |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run Drizzle migrations |
| `pnpm lint` | Lint all apps |

## Adding the admin app

See [apps/admin/README.md](./apps/admin/README.md).

**Important:** The admin app's schema is the source of truth. After copying admin into `apps/admin/`, replace `packages/db/src/schema.ts` with the admin schema and wire admin imports to `@readup/db`.

## Mobile app

```bash
pnpm mobile
# or
cd apps/mobile && pnpm start
```
