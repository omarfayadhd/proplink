import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    // `tests/unit` mocks the database everywhere; `tests/integration` runs
    // against the real one (Task 3.1's search SQL is PostGIS/FTS/pg_trgm, which
    // no mock can meaningfully verify) and skips itself when no DATABASE_URL is
    // configured, so `npm run test` stays one command that is always green.
    include: ["tests/{unit,integration}/**/*.test.{ts,tsx}"],
    environment: "node",
    passWithNoTests: true,
    setupFiles: ["tests/setup/env.ts"],
  },
});
