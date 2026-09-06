# Human Tasks — everything YOU must do manually

> Living checklist, extracted from `PropLink_Sprint_Plan_Claude_Code.md` (full
> step-by-step instructions live there — H-numbers match). Claude Code cannot do
> these: they are account creation, payments, keys and legal. Tick items off and
> paste every credential into `.env.local`. (The "also paste into Vercel" rule
> applies only once we go online — see Deferred.)

> **📌 Current mode: LOCAL-ONLY DEVELOPMENT** (decided 2026-07-23 — ADR-004).
> Everything online/launch-related (GitHub, Vercel, domains, DNS, production
> keys) is parked in the **Deferred** table below with the trigger that revives
> it. Claude Code checks the triggers at the start of each week's work and
> reminds you when one is hit.

## ✅ Do now — the only hard requirement for local dev

- [x] **H1.2 Supabase (database)** — ✅ done 2026-07-23 (project
      `tznxdauihxgkietbppdd`, London; migrated, seeded, verified)
- [x] `NEXTAUTH_SECRET` — generated into `.env.local` 2026-07-09.

_Nothing else is required for local dev right now — next required item is
whatever Deferred trigger fires first (see table below)._

## 🟡 Optional now — all have working fallbacks, do whenever convenient

- [ ] **H1.6 Google OAuth** (~15 min, free) — only if you want "Sign in with
      Google" working locally. console.cloud.google.com → project `proplink-uk` →
      OAuth consent screen (External) → Web client with origin
      `http://localhost:3000` and redirect
      `http://localhost:3000/api/auth/callback/google` →
      `GOOGLE_CLIENT_ID/SECRET`. _Fallback: provider auto-disabled; email/password
      login fully works._
- [ ] **H1.5 Upstash Redis** (~10 min, free) — console.upstash.com → database
      `proplink`, region near eu-west → `UPSTASH_REDIS_REST_URL` + `_TOKEN`.
      Used by the Week-2 metrics strip cache + rate limiting. _Fallback:
      uncached/unlimited in dev._
- [ ] **H1.7 Resend** (~10 min, free, **no domain needed in dev**) — resend.com →
      API key → `RESEND_API_KEY`. Dev emails use Resend's onboarding sender and
      deliver only to your own signup inbox — enough to test Week-2 email
      verification. _Fallback: console/mock mailer. Domain DNS setup is deferred._

## ⏸ Deferred — local-only phase (Claude Code reminds you at the trigger)

| Task                                                      | Revive trigger                                                                                                                                                                                                                      |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **H1.1 GitHub + Vercel**                                  | The moment we go online: CI runs, preview deploys, team access. First deferred item to revive.                                                                                                                                      |
| **H1.3 Domains** (~£25/yr)                                | Going online / Resend production domain / launch (H6.5). ⚠️ Decide the final **brand name** early anyway — renaming code, copy and buckets later is painful.                                                                        |
| **H1.4 AWS S3 + CloudFront**                              | Week 3, Task 2.1 (photo/EPC uploads) if you want real cloud storage. Otherwise Claude Code builds a local-disk storage adapter behind the same interface and S3 waits until go-online.                                              |
| **H1.8 Sentry**                                           | Staging/launch prep. Init code is already a guarded no-op.                                                                                                                                                                          |
| **H1.9 Anthropic API key**                                | Week 9 (Sprint 5 AI features) — needed even for local dev then; ~$50/mo cap. Mocked until the key exists.                                                                                                                           |
| **H1.10a Sumsub sandbox application**                     | By Week 7 (Sprint 4) if you want real sandbox KYC locally; `MockKycService` covers dev regardless. **Production approval takes WEEKS — start the application ~1 month before any public launch.**                                   |
| **H1.10b EPC + Companies House keys**                     | Free 5-min registrations. EPC key: Week 11 (auto-fetch). Companies House key: Week 7 (CRN validation). Fine to grab late.                                                                                                           |
| **H2.1 S3 CORS**                                          | With H1.4, when real S3 uploads arrive.                                                                                                                                                                                             |
| **H2.2 Geocoding API + server key**                       | Week 3 listing form needs lat/lng — if still key-less, Claude Code ships a mock geocoder (fixed per-postcode coords for seeds). Revive for real geocoding.                                                                          |
| **H2.4 Beta-agent recruitment**                           | Launch-oriented; revive when a launch date exists (needs ≥10 agents with live listings).                                                                                                                                            |
| **H3.1 Maps browser key + quotas**                        | Week 6 — the map view + commute engine need a real key **even locally** (Google Maps JS won't render without one). Claude Code reminds you at Sprint 3 start.                                                                       |
| **H3.2 Vercel Cron**                                      | With H1.1/Vercel. Saved-search alerts run manually/locally until then.                                                                                                                                                              |
| **H3.3 Landing hero photograph** ✅ done 2026-09-03       | Generated from `docs/marketing/hero-image-prompt.md` and delivered same day. Lives at `src/assets/heroimage.jpeg`. Re-roll from that brief if the composition ever needs to change — and re-measure the hero's contrast if it does. |
| **H3.4 Landing section renders**                          | Four soft-3D objects for the landing sections — brief and prompts in `docs/marketing/section-render-prompts.md`. Geometric SVG stand-ins ship meanwhile, so nothing is blocked.                                                     |
| **H4.2 Pusher** (free sandbox)                            | Week 7 — realtime funding bars/KYC pill need it even locally (free tier, ~10 min). Reminder at Sprint 4 start.                                                                                                                      |
| **H4.3 FCA counsel**                                      | Before any public launch of syndication (even EOI wording should be counsel-approved). Not needed for local dev.                                                                                                                    |
| **H5.1 Stripe (test mode)**                               | Week 10 billing — test mode needs an account but no live verification for local dev. Reminder at Sprint 5 start.                                                                                                                    |
| **H5.2/H5.3 Anthropic prod + pricing decisions**          | Sprint 5 / pre-launch.                                                                                                                                                                                                              |
| **H6.1–H6.5 ICO, pen test, policies, Workspace, cutover** | All launch-gated. Revive when a launch date is set (pen test booking needs 2–4 weeks lead).                                                                                                                                         |

✅ _Local-dev setup complete when: `DATABASE_URL` + `DIRECT_URL` are in
`.env.local` and migrations + seed have run green._
