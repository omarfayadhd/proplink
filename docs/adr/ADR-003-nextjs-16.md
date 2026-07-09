# ADR-003 — Next.js 16 instead of the brief's "Next.js 15"

**Status:** accepted · 2026-07-09

## Context

`docs/PropLink_Sprint_Plan_Claude_Code.md` §1 specifies "Next.js 15, App Router"
and instructs: do not deviate without flagging. At project start (July 2026),
`create-next-app@latest` ships **Next.js 16.2** — Next 15 is no longer the
current stable line.

## Decision

Build on **Next.js 16.2** (App Router, TypeScript strict). The brief's version
number predates Next 16; everything the plan relies on (App Router, Server
Actions, Route Handlers, `next/image`, ISR/SSR for SEO) is unchanged or improved.

## Consequences

- Longer support window across the 12-week build and beyond launch.
- `next lint` no longer exists — ESLint runs directly (`npm run lint`).
- Ecosystem (Auth.js v5 beta, Sentry 10, Tailwind 4) is verified working against
  16.2 in this repo (typecheck, build, unit tests green).
- Any Next-15-specific guidance in the brief should be read as "current App
  Router idiom".
