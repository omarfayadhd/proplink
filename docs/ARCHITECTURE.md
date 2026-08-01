# PropLink UK — Architecture

> Living document. Any change to stack, schema, patterns or services MUST be
> reflected here in the same piece of work (AGENTS.md § living-docs rule).
> Decisions with trade-offs get an ADR in `docs/adr/`.

## Stack (as installed)

| Layer       | Choice                                                                                                                                                   | Notes                                                                                                                                                                                                                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework   | Next.js 16.2 (App Router) + TypeScript strict                                                                                                            | One repo, one deployable. Server Actions + Route Handlers — no separate API server. See ADR-003                                                                                                                                                                                                                |
| Styling     | Tailwind CSS v4 (`@theme` tokens in `src/app/globals.css`)                                                                                               | shadcn/ui permitted for primitives                                                                                                                                                                                                                                                                             |
| State       | Zustand (client) + TanStack Query (server state)                                                                                                         |                                                                                                                                                                                                                                                                                                                |
| ORM / DB    | **Prisma 7** → PostgreSQL + PostGIS on Supabase                                                                                                          | Driver-adapter architecture — see ADR-001. Pooled URL at runtime, direct URL for migrations. ⚠️ Supabase is used as **managed Postgres ONLY** — never install `@supabase/supabase-js`/`@supabase/ssr` or follow Supabase's client/auth/RLS quickstarts; Prisma is the only DB client and Auth.js the only auth |
| Search      | Postgres FTS (`tsvector` trigger) + `pg_trgm` + PostGIS                                                                                                  | Behind a `SearchService` interface; Elastic/Meilisearch can replace later. NO Elasticsearch in this build                                                                                                                                                                                                      |
| Cache/queue | Upstash Redis                                                                                                                                            | Commute-matrix cache, AI response cache, rate limiting                                                                                                                                                                                                                                                         |
| Auth        | Auth.js (NextAuth v5 beta) — credentials + Google                                                                                                        | JWT sessions carrying `role` + `kycStatus`                                                                                                                                                                                                                                                                     |
| Storage     | `StorageService` interface (`src/services/storage/`) — `MockStorageService` (local disk, active) / `S3StorageService` (real presigned POST + CloudFront) | Sprint 2 Task 2.1. Selected by `STORAGE_PROVIDER=mock\|s3`, default mock while H1.4/H2.1 are deferred — see `docs/BLOCKERS.md`                                                                                                                                                                                 |
| AI          | Anthropic API — Sonnet (Advisor/AVM/Planning), Haiku (Enhancer/tagging)                                                                                  | Arrives Sprint 5; Redis-cached, budget-capped                                                                                                                                                                                                                                                                  |
| Maps        | Google Maps JS API + Routes API `computeRouteMatrix`                                                                                                     | Distance Matrix API is Legacy — do not use                                                                                                                                                                                                                                                                     |
| KYC         | Sumsub (sandbox) behind `KycService` + mock                                                                                                              | Arrives Sprint 4                                                                                                                                                                                                                                                                                               |
| Payments    | Stripe (test mode) — subscriptions/boosts/ads ONLY                                                                                                       | Syndicate charges forbidden while `SYNDICATE_PAYMENTS_ENABLED=false`                                                                                                                                                                                                                                           |
| Realtime    | Pusher Channels                                                                                                                                          | Arrives Sprint 4                                                                                                                                                                                                                                                                                               |
| Email       | `Mailer` interface — Resend (auto when `RESEND_API_KEY` set) + console fallback                                                                          | `src/services/email/mailer.ts`; verification + reset emails live, console-logged in dev                                                                                                                                                                                                                        |
| Hosting/CI  | Vercel + GitHub Actions (`.github/workflows/ci.yml`)                                                                                                     | typecheck, lint, format, unit, E2E on PR                                                                                                                                                                                                                                                                       |
| Monitoring  | Sentry via `instrumentation.ts` / `instrumentation-client.ts`                                                                                            | No-op until `SENTRY_DSN` set                                                                                                                                                                                                                                                                                   |
| Testing     | Vitest (`tests/unit`) + Playwright (`tests/e2e`, prod build on port 3100 in CI)                                                                          |                                                                                                                                                                                                                                                                                                                |

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
- **Route gating** (`src/middleware.ts`): `/admin` (ADMIN), `/agent/**`
  (AGENT/ADMIN), `/investor/**` (INVESTOR/ADMIN) via edge-safe `getToken` on the
  JWT cookie — anonymous → login redirect, wrong role → 403 page. Middleware is
  UX-level only; every mutation ALSO checks `requireRole()` / `requireKyc()`
  (`src/lib/authz.ts`) server-side.
- **Single-use tokens** (`services/users/verificationTokens.ts`): sha256-hashed at
  rest, raw only in the emailed link; email verify 24 h TTL, password reset 1 h.
  A successful reset also marks the email verified.
- **GDPR**: cookie banner (localStorage consent), `/privacy` + `/terms`
  placeholders (final text = H6.3), `DELETE /api/me` anonymises in place and
  preserves `KycRecord` (AML 5-year retention).
- **Admin rule**: every admin mutation writes an `AuditLog` row via
  `services/admin/audit.ts` — no exceptions.
- **Metrics**: `services/metrics/globalMetrics.ts`, Redis `cached()` 60 s
  (`src/lib/redis.ts` — degrades to direct compute without Upstash keys).

## Uploads

- `StorageService` (`src/services/storage/`): presigned-upload interface with
  `MockStorageService` (writes to `public/uploads/dev/` via the dev-only
  `POST /api/uploads/dev` route) and `S3StorageService` (real presigned POST via
  `@aws-sdk/s3-presigned-post`, CloudFront URL from `CLOUDFRONT_URL`). Chosen by
  `STORAGE_PROVIDER=mock|s3`, defaulting to mock while AWS env vars are absent
  (`docs/BLOCKERS.md` H1.4/H2.1).
- `POST /api/uploads/presign` — auth required (AGENT/ADMIN via `requireRole()`),
  Zod-validated content-type allowlist + size caps (images ≤10MB, PDFs ≤20MB,
  `src/services/storage/validation.ts`) before a presign is issued.
- `<ImageUploader max={20}>` (`src/components/uploads/`) — drag-drop + picker,
  client previews, presign → direct upload, drag-reorder via the pure
  `reorderImages()` helper; exposes `{ url, sortOrder }[]` for forms to persist
  (e.g. against `PropertyImage`).

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
| [ADR-004](adr/ADR-004-local-only-dev-phase.md)         | Local-only dev phase — online/launch tasks deferred with revive triggers              |
