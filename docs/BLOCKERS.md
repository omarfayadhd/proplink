# BLOCKERS — waiting on human-task outputs

> Living document. Every gap caused by a missing credential/decision gets a row and
> a mock/fallback so the build never stalls. Print/read this at the start of every
> week. Human task IDs refer to `docs/HUMAN_TASKS.md`.
>
> **Local-only phase (ADR-004):** deliberately deferred items live in
> `HUMAN_TASKS.md` § Deferred and are NOT blockers — this table holds only what
> currently limits the local build.

| Since      | Waiting on                                      | What is blocked                                                          | Fallback in place                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ----------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-09 | **H1.6 Google OAuth** (optional)                | Google login button/provider                                             | Provider auto-disabled; credentials auth fully functional                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-07-09 | **H1.7 Resend** (optional)                      | Real email delivery for verification + password reset (Week 2, Task 1.4) | Console/mock mailer behind the mailer interface                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-07-09 | **H1.5 Upstash** (optional)                     | Redis caching for metrics strip + rate limiting (Week 2, Task 1.5)       | Graceful no-cache / no-limit fallback in dev                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-08-01 | **H1.4 AWS S3 + CloudFront** / **H2.1 S3 CORS** | Real cloud image/PDF storage + CloudFront URLs (Sprint 2, Task 2.1)      | `StorageService` interface (`src/services/storage/`), active provider `MockStorageService` (default `STORAGE_PROVIDER` when AWS env vars absent) — presign points at `POST /api/uploads/dev`, which writes under `public/uploads/dev/` so the upload flow works end-to-end locally. `S3StorageService` is implemented and auto-selected once `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`S3_BUCKET` are set. CORS JSON for H2.1 is ready at `docs/aws/s3-cors.json` — paste into the bucket's CORS config when H1.4 lands. |

Resolved blockers move to the bottom with a ✅ and the resolution date.
Deferred-by-decision (not blocking local work — see ADR-004): H1.1 GitHub/Vercel
(CI runs only in-repo for now), H1.3 domains, H1.4 AWS, H1.8 Sentry, H1.10
applications.

## Resolved

- ✅ 2026-07-23 — **H1.2 Supabase**: `DATABASE_URL`/`DIRECT_URL` in `.env.local`
  (project `tznxdauihxgkietbppdd`, London). Migration + seed applied; `ST_DWithin`,
  FTS trigger, and register→login all verified against the live DB.
