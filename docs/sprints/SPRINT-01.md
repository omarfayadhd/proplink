# Sprint 1 Log — Foundation & Core Infrastructure (Weeks 1–2)

**Goal:** deployed skeleton — auth with 4 roles, complete DB schema, design system,
admin shell, CI/CD.

## Week 1 — what was built (2026-07-09)

### Task 1.1 — Project setup ✅

- Next.js 16.2 (App Router, TS strict — ADR-003) + Tailwind v4 with the full brand token set
  in `src/app/globals.css` (see ADR-002 for the `border`→`line` rename).
- ESLint (next + prettier-compat) and Prettier; `src/generated/**` ignored.
- Branded landing page with static metrics-strip placeholder (live values in 1.5).
- GitHub Actions CI: typecheck/lint/format/vitest + Playwright E2E against a prod
  build. Runs on first push (needs H1.1 repo).
- Sentry via `src/instrumentation.ts` + `src/instrumentation-client.ts` — no-ops
  until `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` are set (H1.8).
- `.env.example` created; every var annotated with its human task.

### Task 1.2 — Database & Prisma 🟡

- Full core schema in `prisma/schema.prisma` (all entities from the sprint plan +
  `VerificationToken` for Week 2 flows). Prisma 7 layout — see ADR-001.
- Init migration `prisma/migrations/20260709000000_init/`: enables `postgis` +
  `pg_trgm`, creates all tables/enums, adds the `searchVector` trigger (weights:
  title A, city/region/postcode B, description C), GIN/GIST/trigram indexes.
- `prisma/seed.ts`: 4 users (one per role, password `Password123!`,
  `*@proplink.test`) + 3 agent profiles.
- **Blocked on H1.2:** `db:migrate`, `db:seed` and the `ST_DWithin` acceptance
  check need a Supabase database. Everything is ready to run.

### Task 1.3 — Auth & RBAC part 1 🟡

- NextAuth v5 (`src/lib/auth.ts`): credentials (bcrypt) + Google (auto-disabled
  until H1.6 keys exist). JWT sessions carry `uid`, `role`, `kycStatus`.
- Registration: `/register` (role selection AGENT/INVESTOR/BUYER + GDPR consent) →
  `POST /api/register` → `services/users/registration.ts` (Zod). ADMIN is
  seed-only. First Google sign-in provisions a BUYER.
- `/login` with credentials sign-in. Logout via NextAuth signOut (nav lands in 1.5).
- Unit tests: registration schema. E2E: landing + auth pages render.
- **Blocked on H1.2:** live register→login acceptance run needs the database.

## Week 2 — planned

Task 1.4 (email verify, password reset, middleware, GDPR endpoints — needs H1.7
Resend key, else mock mailer) · Task 1.5 (nav, KYC pill, metrics strip, UI
primitives, `/dev/ui`) · Task 1.6 (admin shell + AuditLog).

## Deviations & decisions

- Prisma 7 driver-adapter architecture (ADR-001).
- `border` token renamed `line` (ADR-002).
- Added `VerificationToken` model in Week 1 (schema-additive discipline: it's
  needed by Task 1.4 and migrations should stay additive later, so it ships in the
  init migration).
- E2E runs against a production build on port 3100 in CI to keep dev/test parity.

## Checkpoint state (Week 1, Friday)

| Criterion                                      | State                                               |
| ---------------------------------------------- | --------------------------------------------------- |
| CI green on hello-world PR                     | Pending first push (H1.1) — all checks pass locally |
| Preview URL deploys                            | Pending H1.1 (Vercel import)                        |
| Brand tokens on styled landing page            | ✅                                                  |
| `prisma migrate dev` clean + seed + ST_DWithin | 🟡 ready, needs H1.2                                |
| 3 self-serve roles register & log in           | 🟡 code-complete, needs H1.2                        |
