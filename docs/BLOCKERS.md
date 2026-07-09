# BLOCKERS — waiting on human-task outputs

> Living document. Every gap caused by a missing credential/decision gets a row and
> a mock/fallback so the build never stalls. Print/read this at the start of every
> week. Human task IDs refer to `docs/HUMAN_TASKS.md`.

| Since      | Waiting on                                            | What is blocked                                                                                                 | Fallback in place                                                                                         |
| ---------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 2026-07-09 | **H1.2 Supabase** (`DATABASE_URL`, `DIRECT_URL`)      | `db:migrate` + `db:seed`; live verification of registration/login; `ST_DWithin` acceptance check (Task 1.2/1.3) | All code + migration SQL ready to run the moment URLs land in `.env.local`                                |
| 2026-07-09 | **H1.1 GitHub repo + Vercel**                         | CI runs; preview deploys                                                                                        | Local `typecheck`/`lint`/`test`/`build` all green; `git remote add origin … && git push` is the only step |
| 2026-07-09 | **H1.6 Google OAuth** (`GOOGLE_CLIENT_ID/SECRET`)     | Google login button/provider                                                                                    | Provider auto-disabled; credentials auth fully functional                                                 |
| 2026-07-09 | **H1.7 Resend** (`RESEND_API_KEY`)                    | Email verification + password reset emails (Week 2, Task 1.4)                                                   | Will use console/mock mailer behind an interface until key arrives                                        |
| 2026-07-09 | **H1.8 Sentry** (`SENTRY_DSN`)                        | Error reporting                                                                                                 | Init is a guarded no-op                                                                                   |
| 2026-07-09 | **H1.10 Sumsub / EPC / Companies House applications** | Sprint 4 KYC + Sprint 6 intelligence                                                                            | Long-lead: submit now. `MockKycService` planned for Sprint 4 regardless                                   |

Resolved blockers move to the bottom with a ✅ and the resolution date.

## Resolved

_(none yet)_
