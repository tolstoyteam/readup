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

### Archive the iOS app in Xcode

The `apps/mobile/ios` directory is generated and ignored by Git. After pulling a change to Expo, React Native, or a native dependency, regenerate it before opening Xcode:

```bash
pnpm --filter @readup/mobile ios:prepare-archive
```

Open `apps/mobile/ios/Readup.xcworkspace`, select the `Readup` scheme, then use **Product → Archive**. The preparation command recreates the native project from `apps/mobile/app.json` and installs matching pods, including current pod specs.
