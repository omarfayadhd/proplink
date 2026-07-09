# PropLink UK — Architecture

> Living document. Any change to stack, schema, patterns or services MUST be
> reflected here in the same piece of work (AGENTS.md § living-docs rule).
> Decisions with trade-offs get an ADR in `docs/adr/`.

## Stack (as installed)

| Layer       | Choice                                                                          | Notes                                                                                                     |
| ----------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Framework   | Next.js 16.2 (App Router) + TypeScript strict                                   | One repo, one deployable. Server Actions + Route Handlers — no separate API server. See ADR-003           |
| Styling     | Tailwind CSS v4 (`@theme` tokens in `src/app/globals.css`)                      | shadcn/ui permitted for primitives                                                                        |
| State       | Zustand (client) + TanStack Query (server state)                                |                                                                                                           |
| ORM / DB    | **Prisma 7** → PostgreSQL + PostGIS on Supabase                                 | Driver-adapter architecture — see ADR-001. Pooled URL at runtime, direct URL for migrations               |
| Search      | Postgres FTS (`tsvector` trigger) + `pg_trgm` + PostGIS                         | Behind a `SearchService` interface; Elastic/Meilisearch can replace later. NO Elasticsearch in this build |
| Cache/queue | Upstash Redis                                                                   | Commute-matrix cache, AI response cache, rate limiting                                                    |
| Auth        | Auth.js (NextAuth v5 beta) — credentials + Google                               | JWT sessions carrying `role` + `kycStatus`                                                                |
| Storage     | AWS S3 + CloudFront, presigned uploads                                          | Arrives Sprint 2                                                                                          |
| AI          | Anthropic API — Sonnet (Advisor/AVM/Planning), Haiku (Enhancer/tagging)         | Arrives Sprint 5; Redis-cached, budget-capped                                                             |
| Maps        | Google Maps JS API + Routes API `computeRouteMatrix`                            | Distance Matrix API is Legacy — do not use                                                                |
| KYC         | Sumsub (sandbox) behind `KycService` + mock                                     | Arrives Sprint 4                                                                                          |
| Payments    | Stripe (test mode) — subscriptions/boosts/ads ONLY                              | Syndicate charges forbidden while `SYNDICATE_PAYMENTS_ENABLED=false`                                      |
| Realtime    | Pusher Channels                                                                 | Arrives Sprint 4                                                                                          |
| Email       | Resend + React Email                                                            | Arrives Week 2                                                                                            |
| Hosting/CI  | Vercel + GitHub Actions (`.github/workflows/ci.yml`)                            | typecheck, lint, format, unit, E2E on PR                                                                  |
| Monitoring  | Sentry via `instrumentation.ts` / `instrumentation-client.ts`                   | No-op until `SENTRY_DSN` set                                                                              |
| Testing     | Vitest (`tests/unit`) + Playwright (`tests/e2e`, prod build on port 3100 in CI) |                                                                                                           |

## Repo structure

```
/src
  /app                 # App Router: (auth)/login+register, api/, portals arrive per sprint
  /components          # ui/ primitives, then listings/, syndicates/, agents/, charts/, layout/
  /lib                 # db.ts (Prisma), auth.ts (NextAuth) — later: redis, s3, stripe, pusher, resend
  /services            # ALL business logic (users/, later: search/, kyc/, maps/, ai/, marketdata/, fees/)
  /generated/prisma    # generated client (gitignored; `npm run db:generate` / postinstall)
  /types               # ambient types (next-auth session augmentation)
  /jobs                # data ingestion scripts (Sprint 5+)
/prisma                # schema.prisma, migrations/ (raw SQL for PostGIS/FTS), seed.ts
/tests                 # unit/ + e2e/
/docs                  # living docs (see AGENTS.md)
prisma.config.ts       # Prisma 7 CLI config: datasource URL, migrations path, seed cmd
```

## Data model — key conventions

Full schema: `prisma/schema.prisma` (implements the sprint plan's core schema).

- **Money = integer pence** in every `*GBP` field. Never floats.
- `Property.location` is `geography(Point,4326)` (PostGIS `Unsupported` type) —
  set/queried via `$queryRaw`; GIST-indexed.
- `Property.searchVector` is `tsvector`, maintained by a DB trigger
  (title weight A, city/region/postcode B, description C); GIN-indexed, plus
  trigram indexes on title/city for fuzzy fallback.
- Extensions (`postgis`, `pg_trgm`), indexes and the trigger live in the raw SQL of
  `prisma/migrations/20260709000000_init/migration.sql` — Prisma can't model them.
- `KycRecord` is retained 5 years (UK AML): soft-delete only; GDPR erasure
  anonymises the user but keeps the record.
- `VerificationToken` (email verify / password reset) is app-managed, consumed in
  Week 2.
- Listing statuses: DRAFT → PENDING_REVIEW → LIVE → UNDER_OFFER → SOLD (only admin
  approves to LIVE). Syndicates: OPEN → FUNDED → IN_REFURB → LISTED → COMPLETED.

## Auth architecture

- `src/lib/auth.ts` — NextAuth v5: Credentials (bcrypt) always; Google provider
  registered only when H1.6 credentials exist.
- **JWT strategy**; token carries `uid`, `role`, `kycStatus` → exposed on
  `session.user` (typed in `src/types/next-auth.d.ts`). OAuth users get role/kyc
  loaded from DB in the `jwt` callback.
- Registration: `POST /api/register` (thin) → `src/services/users/registration.ts`
  (Zod schema + bcrypt + create). Self-serve roles: AGENT/INVESTOR/BUYER.
  **ADMIN is seed-only.** First Google sign-in provisions a BUYER.
- Week 2 adds: email verification (Resend), password reset, route-group middleware,
  `requireRole()` / `requireKyc()` helpers.

## Design system

Tokens defined once in `src/app/globals.css` (`@theme`): `primary #002147`,
`secondary #003580`, `accent #0066FF`, `surface #F5F8FF`, `pale #EBF2FF`,
`success #0A6640`, `intel #0099A8`, `warning #A05A00`, `danger #C0152A`,
`body #2D3A4A`, `muted #5A6A7A`, `line #D0DAE6` (the brief's "border" — renamed, see
ADR-002). Font: Inter with Calibri-equivalent fallbacks. Never hardcode brand hex
values in components.

## Testing & CI

- Unit: Vitest, `tests/unit/**` — services and pure logic; external providers always
  mocked.
- E2E: Playwright, `tests/e2e/**` — CI builds then serves on port 3100; locally
  reuses your dev server.
- CI (GitHub Actions): typecheck → lint → format:check → vitest; separate job builds
  and runs Playwright. Runs once the repo is pushed to GitHub (H1.1).

## Decisions log

| ADR                                                    | Decision                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| [ADR-001](adr/ADR-001-prisma-7-driver-adapter.md)      | Prisma 7 with `@prisma/adapter-pg` driver adapter (deviation: plan predates Prisma 7) |
| [ADR-002](adr/ADR-002-border-token-renamed-to-line.md) | Brand token `border` exposed as `line` to avoid Tailwind utility clash                |
| [ADR-003](adr/ADR-003-nextjs-16.md)                    | Next.js 16.2 — current stable; the brief's "Next.js 15" predates it                   |
