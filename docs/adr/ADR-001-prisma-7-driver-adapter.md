# ADR-001 — Prisma 7 with the pg driver adapter

**Status:** Accepted · **Date:** 2026-07-09 · **Sprint:** 1 (Task 1.2)

## Context

The sprint plan specifies "Prisma ORM" without a version. `npm install prisma`
today resolves to **Prisma 7**, which differs from the Prisma 5/6 the plan's wording
assumes:

- Connection URLs no longer live in `schema.prisma` — they move to
  `prisma.config.ts` (CLI) and the `PrismaClient` constructor (runtime).
- The client is Rust-free and requires a **driver adapter**
  (`@prisma/adapter-pg` + `pg` for Postgres).
- The generator is `prisma-client` (TypeScript output to `src/generated/prisma`,
  gitignored, regenerated on `postinstall`).

## Decision

Adopt Prisma 7 now rather than pinning Prisma 6.

## Consequences

- `prisma.config.ts` holds the CLI datasource (DIRECT_URL for migrations/seed);
  `src/lib/db.ts` builds the runtime client with `PrismaPg` on the pooled
  `DATABASE_URL`.
- No mid-build forced major upgrade later; smaller cold starts on Vercel (no Rust
  engine binary).
- Anyone following older Prisma tutorials must read this ADR first — the
  schema-file `url =` pattern will not validate.
