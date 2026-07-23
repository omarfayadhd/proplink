# ADR-004 — Local-only development phase (online/launch tasks deferred)

**Status:** accepted · 2026-07-23

## Context

The build is currently a single developer working locally. The sprint plan
front-loads account/infra setup (GitHub+Vercel, domains, AWS, Sentry, DNS) in
Sprint 1, which assumes an immediate path to preview deploys and launch.

## Decision

Develop **local-only** for now. Only the database (Supabase free tier — no local
Docker/Postgres available) is provisioned. Every online/launch-facing human task
is deferred with an explicit **revive trigger** recorded in
`docs/HUMAN_TASKS.md` § Deferred. Claude Code checks triggers at the start of
each week and reminds the human when one is hit.

Consequences for the build order:

- CI workflow ships in-repo but only runs once a GitHub remote exists (H1.1).
  Local gate instead: `typecheck` + `lint` + `format:check` + `test` +
  `test:e2e` green before each task-level commit.
- Sprint 2 uploads (Task 2.1): if AWS is still deferred, build a local-disk
  storage adapter behind the same `StorageService` interface S3 will implement.
- Sprint 2 geocoding (Task 2.2): mock geocoder unless H2.2 is revived.
- Preview-deploy acceptance criteria ("works on the preview URL") are satisfied
  on `localhost` until going online.
- Sumsub **production** application (weeks of lead time) must be started
  ~1 month before any public launch — this is the biggest deferred risk.

## Revisit when

The user wants any of: code backup/collaboration (→ H1.1 first), showing the app
to others (→ H1.1 + Vercel), real uploads (→ H1.4), or a launch date (→ full
Deferred table in HUMAN_TASKS.md).
