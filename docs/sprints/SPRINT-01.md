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

## Week 2 — what was built (2026-07-23)

### Task 1.4 — Auth & RBAC part 2 ✅

- `Mailer` interface: `ResendMailer` (auto-selected when `RESEND_API_KEY` exists)
  - `ConsoleMailer` dev fallback (`src/services/email/mailer.ts`).
- Single-use hashed tokens (`verificationTokens.ts`, sha256 stored, raw in link):
  email verification (24 h TTL) + password reset (1 h TTL, resets also mark the
  email verified). Pages: `/verify-email`, `/forgot-password`, `/reset-password`.
- `src/middleware.ts`: role gates for `/admin`, `/agent/**`, `/investor/**` via the
  JWT cookie (edge-safe `getToken`); anonymous → `/login?callbackUrl=…`, wrong role
  → 403 page. `requireRole()` / `requireKyc()` in `src/lib/authz.ts` for
  handlers/actions.
- GDPR: cookie banner (localStorage + `useSyncExternalStore`), `/privacy` +
  `/terms` placeholders (final text = H6.3), `DELETE /api/me` erasure —
  anonymises in place, preserves `KycRecord` (AML 5-year rule).

### Task 1.5 — Layout, design system & metrics strip ✅

- Root layout now carries `MetricsStrip` (server-computed via
  `services/metrics/globalMetrics`, Redis `cached()` 60 s with no-Redis fallback),
  role-aware `SiteHeader` with live KYC pill + sign-out, `SiteFooter`, cookie banner.
- Primitives in `src/components/ui/`: Button, Card, Input, Select, MultiSelect
  (distress-tag chips), Badge + colour-coded `EpcBadge` (A–G), Modal, Toast,
  DataTable, ProgressBar — showcased at `/dev/ui`.

### Task 1.6 — Admin shell ✅

- `/admin` users table: search, role filter, pagination, deactivate/reactivate via
  server action (`requireRole("ADMIN")` + self-deactivation guard).
- Every admin mutation writes `AuditLog` (`services/admin/audit.ts`).
- Placeholder tabs: Moderation (S2), KYC Queue (S4), Fees (S5), Ads (S6).

### Week 2 verification (all local, live Supabase)

typecheck ✅ · lint ✅ · 23 unit tests ✅ · build ✅ · **12 Playwright E2E ✅**:
register→verify→login for AGENT/INVESTOR/BUYER · GDPR erasure end-to-end ·
anonymous → login redirect · investor → 403 on `/admin` · admin deactivate +
audit row + blocked login · `/dev/ui` primitives · live metrics strip.

## Deviations & decisions

- Prisma 7 driver-adapter architecture (ADR-001).
- `border` token renamed `line` (ADR-002).
- Added `VerificationToken` model in Week 1 (schema-additive discipline: it's
  needed by Task 1.4 and migrations should stay additive later, so it ships in the
  init migration).
- E2E runs against a production build on port 3100 in CI to keep dev/test parity.
- Playwright cannot transpile the ESM Prisma client → E2E DB fixtures use raw `pg`
  (`tests/e2e/helpers/db.ts`); `NEXTAUTH_URL` is overridden to the test port in
  `playwright.config.ts` webServer env so Auth.js redirects stay on 3100.
- Erasure keeps the User row (anonymised) rather than deleting — FK graph stays
  intact and KycRecord retention is trivially satisfied.

## Checkpoint state (Week 1, Friday)

| Criterion                                      | State                                               |
| ---------------------------------------------- | --------------------------------------------------- |
| CI green on hello-world PR                     | Pending first push (H1.1) — all checks pass locally |
| Preview URL deploys                            | Pending H1.1 (Vercel import)                        |
| Brand tokens on styled landing page            | ✅                                                  |
| `prisma migrate dev` clean + seed + ST_DWithin | 🟡 ready, needs H1.2                                |
| 3 self-serve roles register & log in           | 🟡 code-complete, needs H1.2                        |

## Sprint 1 Definition of Done (2026-07-23)

| Criterion                                 | State                                                                               |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| All 4 roles register/login, RBAC enforced | ✅ verified E2E                                                                     |
| Schema migrated (PostGIS + FTS)           | ✅ on Supabase                                                                      |
| Design system + metrics strip             | ✅ `/dev/ui` + live strip                                                           |
| Admin shell + audit log                   | ✅ verified E2E                                                                     |
| Deployed to Vercel, CI enforcing tests    | ⏭ deferred by ADR-004 (local-only); CI ships in-repo, local gate = full suite green |

**Sprint 1 complete (local scope). Next: Sprint 2 — Agent Portal & Listing Engine.**
