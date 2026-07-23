import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js reads .env.local automatically, but the Prisma CLI does not —
// load it here (first wins), then fall back to .env.
config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  // CLI (migrate/seed) uses the DIRECT Supabase connection; the app runtime
  // uses the pooled DATABASE_URL via the pg driver adapter (src/lib/db.ts).
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
