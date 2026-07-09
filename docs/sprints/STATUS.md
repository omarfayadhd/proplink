# Sprint Status — Live Tracker

> Living document. Update task states as work happens; update the phase line in
> `docs/CONTEXT.md` at sprint boundaries. Task definitions and acceptance criteria:
> `docs/PropLink_Sprint_Plan_Claude_Code.md`. Per-sprint detail: `SPRINT-NN.md`.

**We are here → Sprint 1, Week 1** (build tasks code-complete; DB verification
pending H1.2 credentials).

Legend: ✅ done · 🟡 code-complete, verification blocked (see BLOCKERS.md) ·
🔵 in progress · ⬜ not started · ⏭ deferred

## Sprint 1 (Weeks 1–2) — Foundation

| Task                       | Scope                                                                                                               | State                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1.1 Project setup          | Next.js 16 + TS strict + Tailwind tokens, ESLint/Prettier, repo structure, `.env.example`, CI workflow, Sentry init | ✅ (CI runs on first push — H1.1)                                   |
| 1.2 Database & Prisma      | Full schema, PostGIS/pg_trgm migration, FTS trigger, seed (4 users + 3 agent profiles)                              | 🟡 awaiting H1.2 to run `db:migrate`, `db:seed`, `ST_DWithin` check |
| 1.3 Auth & RBAC pt 1       | Credentials + Google, registration w/ role select, JWT with `role`+`kycStatus`, login/logout                        | 🟡 credentials flow needs DB (H1.2); Google needs H1.6              |
| 1.4 Auth & RBAC pt 2       | Email verify, password reset, route middleware, `requireRole()`/`requireKyc()`, GDPR endpoints                      | ⬜ Week 2                                                           |
| 1.5 Layout & metrics strip | Global nav, KYC pill, metrics strip (Redis-cached), UI primitives, `/dev/ui`                                        | ⬜ Week 2 (static strip placeholder on landing)                     |
| 1.6 Admin shell            | `/admin` users table, placeholder tabs, AuditLog on mutations                                                       | ⬜ Week 2                                                           |

**Week 1 checkpoint:** repo+CI ✅ · schema migrated 🟡 (blocked on H1.2) ·
register/login working 🟡 (blocked on H1.2) · Sprint 1 human tasks — with the human.

## Sprint 2 (Weeks 3–4) — Agent Portal & Listing Engine

⬜ 2.1 S3 uploads · ⬜ 2.2 Multi-step listing form · ⬜ 2.3 Moderation queue ·
⬜ 2.4 Agent profile hub · ⬜ 2.5 Property detail v1 · ⬜ 2.6 Leads & analytics ·
⬜ 2.7 Seed 40 listings

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
