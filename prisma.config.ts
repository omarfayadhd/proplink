import "dotenv/config";
import { defineConfig } from "prisma/config";

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
