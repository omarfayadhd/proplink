# PropLink UK

Multi-sided platform for the UK **distressed property** market: marketplace,
investor syndication (Expression-of-Interest mode), agent portal, market
intelligence and an ecosystem marketplace.

> **New here (human or Claude Code)?** Read **[AGENTS.md](AGENTS.md)** first — it
> maps every project document and states the non-negotiable constraints. Current
> progress: [docs/sprints/STATUS.md](docs/sprints/STATUS.md). What the human owes:
> [docs/HUMAN_TASKS.md](docs/HUMAN_TASKS.md).

## Quick start

```bash
npm install                # also runs prisma generate
cp .env.example .env.local # fill in what you have (see docs/HUMAN_TASKS.md)
npm run db:migrate         # needs DIRECT_URL (Supabase)
npm run db:seed            # 4 users (one per role, password: Password123!)
npm run dev                # http://localhost:3000
```

## Checks

```bash
npm run typecheck && npm run lint && npm run format:check
npm run test       # vitest unit tests
npm run test:e2e   # playwright (run `npm run build` first, or have `npm run dev` running)
```

## Stack

Next.js 16 (App Router, strict TS) · Tailwind v4 · Prisma 7 + PostgreSQL/PostGIS
(Supabase) · Auth.js v5 · Upstash Redis · S3/CloudFront · Anthropic API · Google
Maps Routes API · Sumsub · Stripe · Pusher · Resend · Vercel. Full rationale:
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
