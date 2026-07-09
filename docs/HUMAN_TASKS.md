# Human Tasks — everything YOU must do manually

> Living checklist, extracted from `PropLink_Sprint_Plan_Claude_Code.md` (full
> step-by-step instructions live there — H-numbers match). Claude Code cannot do
> these: they are account creation, payments, keys and legal. Tick items off and
> paste every credential into `.env.local` **and** Vercel → Settings → Environment
> Variables. When a key lands, also delete its row from `docs/BLOCKERS.md`.

## 🔴 DO TODAY — long-lead items (H1.10)

- [ ] **Sumsub application** — sumsub.com → sign up → complete business onboarding
      questionnaire. Sandbox comes fast; **production approval can take weeks**.
      #1 schedule risk of the whole build. Chase weekly.
- [ ] **EPC Register API key** — epc.opendatacommunities.org (free) → `EPC_API_KEY`
- [ ] **Companies House API key** — developer.company-information.service.gov.uk
      (free) → `COMPANIES_HOUSE_API_KEY`

## Sprint 1 — do in Days 1–2 (~3–4 hrs total)

- [ ] **H1.1 GitHub + Vercel** (~20 min) — private repo `proplink-uk`; push this
      project (`git remote add origin <url> && git push -u origin main`); import
      into Vercel (Next.js preset). Hobby plan is fine until launch.
- [ ] **H1.2 Supabase** (~15 min) — new project, region **London (eu-west-2)**,
      strong DB password → pooled URI → `DATABASE_URL`, direct URI → `DIRECT_URL`.
      Free plan for now. _(Unblocks migrations, seed and auth verification — the
      biggest current blocker.)_
- [ ] **H1.3 Domains** (~15 min, ≈£25/yr) — buy `.co.uk` + `.com` at Cloudflare/
      Namecheap. Decide the final brand name NOW. Don't point DNS at Vercel yet.
- [ ] **H1.4 AWS** (~40 min) — account + root MFA; IAM user `proplink-app`
      (least-privilege S3 policy) → keys; S3 bucket `proplink-media-prod`
      (eu-west-2, public access blocked); CloudFront with OAC; £20/mo budget alert.
- [ ] **H1.5 Upstash Redis** (~10 min) — DB `proplink`, region near eu-west, TLS →
      `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.
- [ ] **H1.6 Google Cloud OAuth** (~20 min) — project `proplink-uk` + billing;
      OAuth consent screen (External, publish); Web client with
      `http://localhost:3000` + Vercel URL origins and
      `…/api/auth/callback/google` redirects → `GOOGLE_CLIENT_ID/SECRET`.
- [ ] **H1.7 Resend** (~15 min + DNS wait) — add your domain, set DKIM/SPF records
      at the registrar → `RESEND_API_KEY`.
- [ ] **H1.8 Sentry** (~10 min) — org + Next.js project → `SENTRY_DSN`
      (+ `NEXT_PUBLIC_SENTRY_DSN`, same value).
- [ ] **H1.9 Anthropic** (~10 min) — console.anthropic.com API key →
      `ANTHROPIC_API_KEY`; set a ~$50/mo spend cap + usage alert.
- [ ] Also: generate `NEXTAUTH_SECRET` (`openssl rand -base64 32`) for
      `.env.local` and Vercel.

✅ _Sprint 1 human tasks complete when every env var above is filled (except
Sumsub/Stripe/Pusher/Maps — later sprints) and the three H1.10 applications are
submitted._

## Sprint 2 (early Week 3)

- [ ] **H2.1 S3 CORS** (~10 min) — paste the CORS JSON Claude Code outputs in Task
      2.1 into the bucket's CORS config.
- [ ] **H2.2 Geocoding API + server key** (~10 min) — enable Geocoding API; create
      IP-restricted server key → `GOOGLE_MAPS_SERVER_KEY`; £20 budget + alerts
      (the old $200/mo Google credit no longer exists).
- [ ] **H2.3 Brand assets** (~30 min) — logo (SVG + PNG) + 512×512 icon, or ask for
      a placeholder wordmark; confirm the navy/blue palette now.
- [ ] **H2.4 Beta-agent recruitment** (ongoing) — pitch 5–10 distressed/probate
      agents; launch needs ≥10 agents with live listings.

## Sprint 3 (before Week 6)

- [ ] **H3.1 Maps APIs + browser key + quotas** (~20 min) — enable Maps JS, Places
      (New), Routes; referrer-restricted browser key → `GOOGLE_MAPS_API_KEY`; add
      Routes API to the server key; cap Route Matrix at ~5,000 elements/day.
- [ ] **H3.2 Vercel Cron** (~5 min) — confirm cron availability on your plan.

## Sprint 4 (Monday of Week 7; H4.1 needs the H1.10 Sumsub approval)

- [ ] **H4.1 Sumsub sandbox** (~45 min) — app token + secret; verification level
      `proplink-investor` (passport + liveness); webhook to
      `/api/webhooks/sumsub` → `SUMSUB_*` vars; run one test applicant end-to-end.
- [ ] **H4.2 Pusher** (~10 min) — Channels app `proplink`, cluster **eu** →
      `PUSHER_*` vars.
- [ ] **H4.3 Engage FCA counsel** — shortlist 2–3 fintech firms; brief: EOI-only
      launch, need perimeter confirmation + authorisation route. Budget
      £5–20k one-off + £500–1,500/mo retainer. Get the exact EOI wording for the
      pledge screen.

## Sprint 5 (Monday of Week 9)

- [ ] **H5.1 Stripe** (~45 min + verification wait) — UK business verification;
      test-mode products: Starter £49/mo, Pro £149/mo, Elite £399/mo, Boost £19
      one-off → price IDs to Claude Code; API keys + CLI webhook secret →
      `STRIPE_*` vars.
- [ ] **H5.2 Anthropic production readiness** (≈10 min) — rate-limit tier check;
      raise spend cap (≈$200/mo) + alerts.
- [ ] **H5.3 Commercial decisions** (~15 min) — confirm tier prices/limits, boost
      price/duration, success-fee % + VAT treatment (check with accountant).

## Sprint 6 (start of Week 11 — H6.2 has 2–4 weeks lead time)

- [ ] **H6.1 ICO registration** (~20 min, £52/yr) — register as data controller;
      give the registration number to Claude Code for the footer/privacy page.
- [ ] **H6.2 Book penetration test** — 2–3 CREST firms; £4k–12k; distrust <£3k
      quotes; schedule Week 12 or just after; reserve remediation window.
- [ ] **H6.3 Final Privacy/ToS/Cookie policies** — from solicitor (include EOI
      wording from H4.3); hand text to Claude Code for `/privacy`, `/terms`,
      `/cookies`.
- [ ] **H6.4 Google Workspace** (~15 min, ~£10–14/mo) — `support@` + `admin@`;
      verify domain, MX records.
- [ ] **H6.5 Production cutover** (Week 12, ~1–2 hrs) — DNS to Vercel; Vercel Pro;
      Supabase Pro + backup restore drill; Stripe live keys + live webhook; Sumsub
      production keys (or "verification opening soon" gate); restrict Maps key to
      live domain; confirm Anthropic cap; beta UAT (3 agents + 2 investors);
      budget/spend alerts everywhere.
