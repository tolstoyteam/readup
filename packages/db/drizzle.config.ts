import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "drizzle-kit";
import { normalizeDatabaseUrl } from "./src/database-url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.resolve(rootDir, "../../.env") });

const rawUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error("Set DIRECT_URL or DATABASE_URL for drizzle-kit");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: normalizeDatabaseUrl(rawUrl),
  },
});
