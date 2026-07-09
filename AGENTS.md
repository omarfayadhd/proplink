# PropLink UK — Agent & Developer Guide

PropLink UK is a multi-sided platform for the UK **distressed property** market:
marketplace, investor syndication (Expression-of-Interest mode), agent portal and
market intelligence. Everything needed to develop this project lives **in this
repo** — a fresh Claude Code session (or human) should be productive after reading
this file and the docs it points to.

## Read this first — document map

| Document                                   | What it holds                                                                            | Read when                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------- |
| `docs/CONTEXT.md`                          | Product/domain context: roles, portals, core loop, compliance constraints, current phase | Always, first                          |
| `docs/ARCHITECTURE.md`                     | Tech stack, repo structure, data model, auth, search, service-layer rules                | Before writing any code                |
| `docs/sprints/STATUS.md`                   | Live tracker: which sprint/week/task we are on, what is done                             | Start of every session                 |
| `docs/sprints/SPRINT-NN.md`                | Per-sprint log: what was built, decisions, deviations, checkpoint state                  | When working in that sprint            |
| `docs/BLOCKERS.md`                         | What is blocked on human-task outputs, and which mock covers it                          | Start of every week                    |
| `docs/HUMAN_TASKS.md`                      | Every manual task the human must do (accounts, keys, legal), by sprint                   | When the human asks "what do I owe?"   |
| `docs/adr/`                                | Architecture Decision Records — one file per significant decision                        | When questioning "why is X like this?" |
| `docs/PropLink_UK_Master_Document.md`      | Original master plan: modules, workflows, costs                                          | Reference                              |
| `docs/PropLink_Sprint_Plan_Claude_Code.md` | Original 12-week build brief with per-task acceptance criteria                           | Reference — the task source of truth   |

## 📌 The living-docs rule (non-negotiable)

**Any change to architecture, stack, schema, conventions, or product scope MUST be
reflected in the relevant `docs/*.md` file in the same piece of work** — not later:

- New/changed technology, pattern, schema or service → update `docs/ARCHITECTURE.md`.
- Significant decision or deviation from the sprint plan → add a `docs/adr/ADR-NNN-*.md`.
- Task started/finished, checkpoint passed → update `docs/sprints/STATUS.md` and the sprint log.
- Blocked on a missing credential/human output → add a row to `docs/BLOCKERS.md`, build the mock, keep going. Never stall.
- Product scope/constraint change → update `docs/CONTEXT.md`.

## ⚠️ Non-negotiable constraints (from the sprint plan)

1. **EOI mode — no real money for syndicates.** `SYNDICATE_PAYMENTS_ENABLED=false` stays false; any code path that would create a Stripe charge for pledges must throw while false. Stripe is ONLY for agent subscriptions, boosts and ads.
2. **KYC gate.** No syndicate pledge without `kycStatus = APPROVED` — enforced **server-side**.
3. Money is **integer pence** in all `*GBP` fields — never floats.
4. Business logic lives in `/src/services`; route handlers stay thin (validate with Zod → call service → respond).
5. Server-side RBAC on every mutation; never trust the client for role or KYC status.
6. External providers (Sumsub, Maps, AI, Stripe, Search) are consumed only through `/src/services` interfaces with mock implementations — tests never hit live APIs.
7. Cache before you call: Google Maps and Anthropic calls check Redis first.
8. All migrations are **additive** after Week 4.
9. RICS disclaimer on every AI valuation/planning output; EPC rating displayed on every listing.

## Commands

```bash
npm run dev          # dev server (localhost:3000)
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format:check # prettier
npm run test         # vitest unit tests
npm run test:e2e     # playwright (builds not required locally; CI builds first)
npm run db:migrate   # prisma migrate dev   (needs DIRECT_URL)
npm run db:seed      # prisma db seed       (needs DIRECT_URL)
```

## Environment

Copy `.env.example` → `.env.local`. Every variable is annotated with the human task
(H-number) that supplies it. Missing credentials are expected during the build —
use the mock implementation and record it in `docs/BLOCKERS.md`.

## Conventions

- TypeScript strict; no `any` without `// TODO(any):` justification.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`); one PR-sized commit per task.
- Every service gets unit tests; every user-facing checkpoint flow gets a Playwright test.
- Design tokens only (see `src/app/globals.css`) — never hardcode brand hex values. Note: the brief's `border` colour is exposed as `line` (`border-line`) to avoid clashing with Tailwind's `border-*` utilities.
- Rate-limit all public POST endpoints (Upstash) once H1.5 keys exist.
