import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

// Raw pg for E2E fixtures/assertions: Playwright's transpiler can't load the
// ESM Prisma client, and tests should hit the DB independently anyway.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export const hasDb = !!url;

let pool: Pool | null = null;

export function q<T extends Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  pool ??= new Pool({ connectionString: url });
  return pool.query(text, params).then((r) => r.rows as T[]);
}

export async function closeDb() {
  await pool?.end();
  pool = null;
}
