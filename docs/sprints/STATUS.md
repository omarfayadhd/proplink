# Sprint Status — Live Tracker

> Living document. Update task states as work happens; update the phase line in
> `docs/CONTEXT.md` at sprint boundaries. Task definitions and acceptance criteria:
> `docs/PropLink_Sprint_Plan_Claude_Code.md`. Per-sprint detail: `SPRINT-NN.md`.
> Sprint-level progress sheet (status/remarks/comments): `SPRINT-TRACKER.md`.

**We are here → Sprint 2 (Agent Portal & Listing Engine) in progress on branch
`sprint-2` — Tasks 2.1, 2.2, 2.3 and 2.4 code-complete, 2.5–2.7 next.** Database
live on Supabase; Sprint 1 fully verified locally (23 unit + 12 E2E tests
green). Sprint 2 so far: 254 unit tests green, typecheck/lint/format clean,
production build green; DB-backed verification (migrate, dev-server,
Playwright) blocked in this sandbox by a Supabase pooler connectivity issue —
see `BLOCKERS.md` and `SPRINT-02.md` for the exact commands to verify once DB
access works. Vercel/CI deployment criteria deferred per ADR-004.

Legend: ✅ done · 🟡 code-complete, verification blocked (see BLOCKERS.md) ·
🔵 in progress · ⬜ not started · ⏭ deferred

## Sprint 1 (Weeks 1–2) — Foundation

| Task                       | Scope                                                                                                               | State                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1.1 Project setup          | Next.js 16 + TS strict + Tailwind tokens, ESLint/Prettier, repo structure, `.env.example`, CI workflow, Sentry init | ✅ (CI runs on first push — H1.1)                                   |
| 1.2 Database & Prisma      | Full schema, PostGIS/pg_trgm migration, FTS trigger, seed (4 users + 3 agent profiles)                              | ✅ verified 2026-07-23: migrate+seed clean, `ST_DWithin` + FTS pass |
| 1.3 Auth & RBAC pt 1       | Credentials + Google, registration w/ role select, JWT with `role`+`kycStatus`, login/logout                        | ✅ verified 2026-07-23: register+login live; Google deferred (H1.6) |
| 1.4 Auth & RBAC pt 2       | Email verify, password reset, route middleware, `requireRole()`/`requireKyc()`, GDPR endpoints                      | ✅ verified 2026-07-23 (E2E: verify→login ×3 roles, 403, erasure)   |
| 1.5 Layout & metrics strip | Global nav, KYC pill, metrics strip (Redis-cached), UI primitives, `/dev/ui`                                        | ✅ verified 2026-07-23 (`/dev/ui` + live strip E2E)                 |
| 1.6 Admin shell            | `/admin` users table, placeholder tabs, AuditLog on mutations                                                       | ✅ verified 2026-07-23 (deactivate + audit row E2E)                 |

**Week 1 checkpoint: PASSED 2026-07-23** — repo ✅ (CI in-repo, runs when H1.1
revives) · schema migrated + seeded on Supabase ✅ · register/login verified ✅ ·
human tasks: H1.2 done; rest deferred per ADR-004.

**Week 2 checkpoint / Sprint 1 DoD: PASSED 2026-07-23** — 4 roles + RBAC
enforced (middleware + server-side) ✅ · design system + live metrics strip ✅ ·
admin shell + audit ✅ · GDPR (banner, placeholders, erasure) ✅ · Vercel/CI
deploy criteria ⏭ deferred (ADR-004). Detail: `SPRINT-01.md`.

## Sprint 2 (Weeks 3–4) — Agent Portal & Listing Engine

🟡 2.1 S3 uploads · 🟡 2.2 Multi-step listing form · 🟡 2.3 Moderation queue ·
🟡 2.4 Agent profile hub · ⬜ 2.5 Property detail v1 · ⬜ 2.6 Leads & analytics ·
⬜ 2.7 Seed 40 listings

2.2 code-complete: `GeocodingService` (mock, real-provider-ready), `ListingService`
(status machine, listing-limit gate, draft/update/submit), 3 thin Zod-validated
routes, 5-step wizard at `/agent/listings/**`. 73 new unit tests green (status
machine, limit, geocode cache, Zod edge cases, service + route handlers).
Verification blocked on Supabase connectivity in this sandbox — see
`SPRINT-02.md` for the commands to run once DB access works.

2.3 code-complete: `ModerationService` (`src/services/listings/moderationService.ts`)
— approve (LIVE + `publishedAt`, re-asserts the free-tier listing limit, clears
any stale rejection reason, AuditLog, agent email) and reject (PENDING_REVIEW
→ DRAFT — a new admin-only edge added to the status machine — persists
`rejectionReason`, AuditLog, agent email with the reason). Two additive
columns (`Property.rejectionReason`, `Property.submittedAt`). Real
`/admin/moderation` page (table + full-preview "Review" modal, Approve/Reject)
replaces the Sprint 1 placeholder. 36 new unit tests green (status machine,
`transitionStatus` extension, service, both routes). Playwright spec written
(`tests/e2e/admin-moderation.spec.ts`); DB-backed verification blocked the same
way as 2.1/2.2 — see `SPRINT-02.md`.

2.4 code-complete: `AgentProfileService` (`src/services/agents/`) — public
`/agents/[id]` aggregates (star rating from `Appraisal.rating`, Verified
Completed Deals from SOLD listings, both computed live), case-study CRUD
(owner-agent only), and the appraisal qualification rule (INVESTOR/BUYER role,
prior Enquiry/Deal on the agent's listings, one review per user per profile —
all server-enforced, not just Zod). Multi-profile switcher in the agent nav
(httpOnly cookie, server-verified on every write) now feeds the listing
wizard's default profile. No migration needed — the schema already had every
field this task used. 70 new unit tests green (aggregates, ownership,
qualification rule, both new route files, the switcher's server action).
Playwright spec written (`tests/e2e/agent-profile-hub.spec.ts`); DB-backed
verification blocked the same way as 2.1–2.3 — see `SPRINT-02.md`.

## Sprint 3 (Weeks 5–6) — Search, Map & Commute

⬜ 3.1 SearchService · ⬜ 3.2 Search UI · ⬜ 3.3 Map & density grid ·
⬜ 3.4 Commute engine · ⬜ 3.5 Saved searches & alerts

## Sprint 4 (Weeks 7–8) — Investor Portal, KYC & Syndicates (EOI)

⬜ 4.1 KycService (Sumsub + mock) · ⬜ 4.2 Syndicate pledge flow ·
⬜ 4.3 Refurb console · ⬜ 4.4 Investor dashboard · ⬜ 4.5 Lifecycle to completion

## Sprint 5 (Weeks 9–10) — AI, Stripe & Buyer Portal

⬜ 5.1 AiService foundations · ⬜ 5.2 AI Advisor · ⬜ 5.3 AVM ·
⬜ 5.4 Listing Enhancer · ⬜ 5.5 Planning tool · ⬜ 5.6 Stripe billing ·
⬜ 5.7 Buyer portal & deal flow

## Sprint 6 (Weeks 11–12) — Intelligence, Hardening & Launch

⬜ 6.1 Market intelligence · ⬜ 6.2 Planning feed · ⬜ 6.3 Ecosystem & ads ·
⬜ 6.4 Performance · ⬜ 6.5 Security & GDPR closeout · ⬜ 6.6 QA & UAT · ⬜ 6.7 Launch

## Cut-first scope (if a week runs over)

Ad-slot billing → planning probability tool → PWA manifest. **Never** cut security,
KYC gating or GDPR tasks.
