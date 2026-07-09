# PropLink UK — 12-Week Sprint Plan (Claude Code Build Brief)

> **How to use this file:** Give this entire file to Claude Code as the project brief (keep it in the repo root, or reference it from `CLAUDE.md`). The build is **12 weeks = 6 two-week sprints**. Work strictly **one week at a time, in order** — each week has its own tasks and an end-of-week checkpoint. Do not start a task until its dependencies (listed) are done. Every task has acceptance criteria — a task is only "done" when all criteria pass and the code is committed with tests green.
>
> **Each sprint has two parts:** 🤖 **Build tasks** (Claude Code does these) and 👤 **Human tasks** (account creation, API keys, legal, purchases — Claude Code CANNOT do these; the human must). Human tasks are listed at the start of each sprint with step-by-step instructions, because the build tasks depend on their outputs (keys, credentials, decisions). **Claude Code: if a required credential from a human task is missing, use the mock implementation, log it in `/docs/BLOCKERS.md`, and keep building — never stall.**

---

## Week-by-Week Calendar (the whole build at a glance)

| Week | Sprint | Theme | Headline deliverable by Friday |
|---|---|---|---|
| **Week 1** | Sprint 1 | Project foundation | Repo + CI/CD deployed, full DB schema migrated, auth started. **Human: all core accounts created; Sumsub application submitted (longest lead time).** |
| **Week 2** | Sprint 1 | Auth, design system, admin | 4-role auth + RBAC live, design system + metrics strip, admin shell. |
| **Week 3** | Sprint 2 | Listing engine | S3 uploads + full multi-step listing form working end-to-end. |
| **Week 4** | Sprint 2 | Agent portal complete | Moderation queue, agent credibility profile, property detail v1, leads, 40 seeded listings. |
| **Week 5** | Sprint 3 | Search core | Filtered full-text + geospatial SearchService with complete search UI. |
| **Week 6** | Sprint 3 | Map & commute | Map view + density heatmap, commute travel-time engine (cached), saved searches & alerts. |
| **Week 7** | Sprint 4 | KYC & syndicates | Sumsub sandbox KYC flow live; syndicate projects + pledge flow (EOI mode). |
| **Week 8** | Sprint 4 | Investor portal complete | Refurb console with ledger, investor dashboard, project lifecycle to completion. |
| **Week 9** | Sprint 5 | AI features | AI foundations + Advisor + AVM + Listing Enhancer all working. |
| **Week 10** | Sprint 5 | Payments & buyer portal | Planning tool, Stripe subscription tiers + boosts, full buyer journey (chat → viewing → offer → deal tracker). |
| **Week 11** | Sprint 6 | Intelligence & performance | EPC auto-fetch, planning feed, ecosystem marketplace, Lighthouse ≥ 90. |
| **Week 12** | Sprint 6 | Harden & launch | Security pass, GDPR closeout, full QA + UAT, production go-live. |

### 👤 Human tasks index (what you must do yourself, by sprint)

| Sprint | Human tasks (details inside each sprint) |
|---|---|
| Sprint 1 | H1.1 GitHub+Vercel · H1.2 Supabase · H1.3 Domains · H1.4 AWS S3/CloudFront · H1.5 Upstash · H1.6 Google Cloud OAuth · H1.7 Resend · H1.8 Sentry · H1.9 Anthropic key · H1.10 ⚠️ Long-lead: Sumsub application, EPC key, Companies House key |
| Sprint 2 | H2.1 S3 CORS · H2.2 Geocoding API + server key · H2.3 Brand assets · H2.4 Begin beta-agent recruitment |
| Sprint 3 | H3.1 Maps/Places/Routes APIs + browser key + quotas · H3.2 Vercel Cron check |
| Sprint 4 | H4.1 Sumsub sandbox config + webhook · H4.2 Pusher account · H4.3 Engage FCA counsel |
| Sprint 5 | H5.1 Stripe account + products + CLI · H5.2 Anthropic production limits · H5.3 Confirm pricing decisions |
| Sprint 6 | H6.1 ICO registration · H6.2 Book penetration test · H6.3 Final Privacy/ToS from solicitor · H6.4 Google Workspace · H6.5 Production cutover checklist |

---

## 0. Project Context (read first)

**PropLink UK** is a web-first, multi-sided platform for the UK **distressed property** market. It connects:

- **Agents** (supply): list distressed properties with defect tags, EPC, target refurb ROI.
- **Investors** (capital): pass KYC, then pool capital into **syndicates** — multiple investors fund one refurbishment project, receive proportional equity, and track milestones/expenses on a shared dashboard.
- **Buyers** (demand): Rightmove/Zoopla-style search, plus on-platform chat, viewing booking, digital offers, and a deal tracker.
- **Admin**: moderation, KYC monitoring, fees, ads, analytics.

**The core loop:** Agent lists property → Investor finds & funds it (or Buyer purchases) → deal closes on-platform → platform logs a success fee.

**Five portals** share one nav bar + a global metrics strip (Total Distress Inventory · Completed Syndicate Deals · Accrued Success Fees · Vetted Referrals Routed): Marketplace, Investor Portal, Agent Portal, Market Intelligence, Ecosystem Marketplace.

### ⚠️ Two non-negotiable constraints

1. **FCA constraint — Expression-of-Interest (EOI) mode.** Equity syndication is a regulated activity. Until legal clearance, the syndicate engine must **never move real money**. Investors *pledge* amounts (recorded in the DB, shown on progress bars, equity previews calculated) but **no Stripe charge is created for syndicate capital**. Stripe is used ONLY for agent subscriptions, listing boosts, and ad billing. Build the capital flow behind a feature flag `SYNDICATE_PAYMENTS_ENABLED=false`.
2. **KYC gate.** No investor may pledge to a syndicate without `kyc_status = approved`. Enforce server-side, not just in the UI.

### Compliance requirements baked into the build

- **GDPR:** consent checkbox at registration, cookie banner, privacy policy + ToS pages, right-to-erasure endpoint, AES-256 at rest (managed by providers) + TLS 1.3.
- **RICS disclaimer** on every AI valuation/planning output: *"AI valuations represent statistical projections based on registry comparable databases. Pre-app estimates do not substitute for official RICS-qualified surveys."*
- **Property law:** all material information (defects, probate status) displayed; **EPC rating displayed on every listing** (legally required in the UK).
- **KYC records** retained 5 years (soft-delete only for KYC data).

---

## 1. Definitive Tech Stack (do not deviate without flagging)

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15, App Router, TypeScript (strict)** | One repo, one deployable. Server Actions + Route Handlers for API. No separate Express server. |
| Styling | **Tailwind CSS** + design tokens below | shadcn/ui permitted for primitives. |
| State | **Zustand** (client) + **TanStack Query** (server state) | |
| ORM / DB | **Prisma** → **PostgreSQL + PostGIS on Supabase** | Enable PostGIS extension. Use raw SQL via `$queryRaw` for geospatial + FTS queries. |
| Search | **Postgres FTS (`tsvector`) + `pg_trgm` + PostGIS** | Wrap in `SearchService` interface so Elastic/Meilisearch can replace it later. NO Elasticsearch in this build. |
| Cache/queue | **Upstash Redis** | Commute-matrix cache, AI response cache, rate limiting. |
| Auth | **Auth.js (NextAuth v5)** — credentials + Google | JWT sessions. Roles: `AGENT`, `INVESTOR`, `BUYER`, `ADMIN`. |
| Storage | **AWS S3 + CloudFront**, presigned uploads | Buckets: `listings/`, `epc/`, `floorplans/`, `milestones/`, `avatars/`. |
| AI | **Anthropic API** — `claude-sonnet-4-6` for Advisor/AVM/Planning; `claude-haiku-4-5` for Listing Enhancer & tagging | Use prompt caching for the listings context; cache responses in Redis (24h TTL keyed on inputs). |
| Maps | **Google Maps JS API** + **Routes API `computeRouteMatrix`** | ⚠️ Distance Matrix API is Legacy (cannot be enabled on new projects since March 2025). Bill is per element (origins × destinations) — cap candidate sets and cache aggressively. |
| Gov data | Land Registry Price Paid (free CSV/API), EPC Register API (free, needs API key), Companies House API (free), planning.data.gov.uk (free) | |
| KYC | **Sumsub** (sandbox during build) | WebSDK + webhooks. Mock adapter behind `KycService` interface until live keys arrive. |
| Payments | **Stripe** — Billing (subscriptions), webhooks | Test mode throughout the build. |
| Realtime | **Pusher Channels** (Sandbox tier) | Chat, syndicate funding updates, KYC status pushes. |
| Email | **Resend** + React Email | |
| Hosting/CI | **Vercel** + **GitHub Actions** | CI: typecheck, lint, unit tests, Playwright E2E on PR. |
| Monitoring | **Sentry** (Developer tier) | Client + server init. |
| Testing | **Vitest** (unit) + **Playwright** (E2E) | |

### Design tokens (Tailwind config)

```
background: #FFFFFF   primary:  #002147 (deep navy)   secondary: #003580
accent/CTA: #0066FF   surface:  #F5F8FF               pale:      #EBF2FF
success:    #0A6640   intel:    #0099A8               warning:   #A05A00
danger:     #C0152A   body:     #2D3A4A               muted:     #5A6A7A
border:     #D0DAE6   font: Calibri-equivalent web stack (e.g. Inter/system-ui)
```

### Repo structure

```
/src
  /app                 # App Router: (marketing), (auth), marketplace, investor, agent, intel, ecosystem, admin, api/
  /components          # ui/ (primitives), listings/, syndicates/, agents/, charts/, layout/
  /lib                 # db.ts (prisma), auth.ts, redis.ts, s3.ts, stripe.ts, pusher.ts, resend.ts
  /services            # search/, kyc/, maps/, ai/, marketdata/, fees/   ← business logic lives here, not in routes
  /jobs                # data ingestion scripts (land registry, epc)
/prisma                # schema.prisma, migrations, seed.ts
/tests                 # unit + e2e
/docs                  # this file, ADRs, BLOCKERS.md
```

### Environment variables (create `.env.example` in Week 1)

```
DATABASE_URL=                 # Supabase pooled connection
DIRECT_URL=                   # Supabase direct (for migrations)
NEXTAUTH_SECRET=  NEXTAUTH_URL=
GOOGLE_CLIENT_ID=  GOOGLE_CLIENT_SECRET=
AWS_ACCESS_KEY_ID=  AWS_SECRET_ACCESS_KEY=  AWS_REGION=  S3_BUCKET=  CLOUDFRONT_URL=
UPSTASH_REDIS_REST_URL=  UPSTASH_REDIS_REST_TOKEN=
ANTHROPIC_API_KEY=
GOOGLE_MAPS_API_KEY=          # browser key, referrer-restricted
GOOGLE_MAPS_SERVER_KEY=       # server key for Geocoding + Routes API
SUMSUB_APP_TOKEN=  SUMSUB_SECRET_KEY=  SUMSUB_WEBHOOK_SECRET=
STRIPE_SECRET_KEY=  STRIPE_WEBHOOK_SECRET=  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
PUSHER_APP_ID=  PUSHER_KEY=  PUSHER_SECRET=  PUSHER_CLUSTER=
RESEND_API_KEY=
EPC_API_KEY=                  # EPC Register (free registration)
COMPANIES_HOUSE_API_KEY=      # free registration
SENTRY_DSN=
SYNDICATE_PAYMENTS_ENABLED=false
AI_MONTHLY_BUDGET_GBP=100
```

### Core database schema (implement in Week 1; extend as noted per week)

```
User(id, email, passwordHash?, name, role[AGENT|INVESTOR|BUYER|ADMIN], emailVerified,
     kycStatus[NOT_STARTED|PENDING|APPROVED|REJECTED], complianceCode?, avatarUrl, gdprConsentAt, createdAt)
AgentProfile(id, userId, agencyName, bio, rating, verifiedDealCount, complianceCode, active)
Property(id, agentProfileId, title, description, status[DRAFT|PENDING_REVIEW|LIVE|UNDER_OFFER|SOLD],
     addressLine1, city, region, postcode, location geography(Point,4326),
     propertyType[RESIDENTIAL|COMMERCIAL|HMO|LAND], bedrooms, askingPriceGBP, targetRoiPct,
     epcRating[A..G]?, epcCertUrl?, floorPlanUrl?, searchVector tsvector, createdAt, publishedAt)
DistressTag enum: SUBSIDENCE|DAMP|RENOVATION_NEEDED|PROBATE|ASBESTOS|ROOF_REQUIRED|WATER_DAMAGE|FIRE_DAMAGE
PropertyDistressTag(propertyId, tag)
PropertyImage(id, propertyId, url, sortOrder)
SyndicateProject(id, propertyId, name, capitalTargetGBP, equityModelNotes, status[OPEN|FUNDED|IN_REFURB|LISTED|COMPLETED],
     capitalProtectionPolicy text, createdAt)
SyndicatePledge(id, projectId, investorUserId, amountGBP, status[PLEDGED|CONFIRMED|WITHDRAWN], createdAt)  # EOI mode: money never moves
Milestone(id, projectId, title, notes, status[PLANNED|IN_PROGRESS|COMPLETE], completedAt)
MilestonePhoto(id, milestoneId, url)
LedgerEntry(id, projectId, type[EXPENSE|CAPITAL_INJECTION], amountGBP, description, createdBy, createdAt)
Enquiry(id, propertyId, fromUserId, message, status[NEW|RESPONDED|CLOSED], createdAt)
SavedProperty(userId, propertyId)  SavedSearch(id, userId, name, paramsJson, alertsEnabled)
CaseStudy(id, agentProfileId, title, capexGBP, netMarginGBP, description, imageUrl?)
Appraisal(id, agentProfileId, investorUserId, rating 1..5, review, createdAt)
Subscription(id, agentUserId, stripeCustomerId, stripeSubId, tier[STARTER|PRO|ELITE], status, listingLimit)
SuccessFee(id, propertyId, projectId?, amountGBP, vatGBP, loggedAt)
Offer(id, propertyId, buyerUserId, amountGBP, status[SUBMITTED|ACCEPTED|REJECTED|WITHDRAWN], createdAt)
Deal(id, propertyId, offerId, stage[OFFER_ACCEPTED|SOLICITOR_REFERRED|CONVEYANCING|EXCHANGED|COMPLETED], updatedAt)
Viewing(id, propertyId, buyerUserId, slotStart, slotEnd, status[REQUESTED|CONFIRMED|DECLINED|DONE])
ChatMessage(id, propertyId, fromUserId, toUserId, body, readAt, createdAt)
Partner(id, category[INSURANCE|CONVEYANCING|STAGING|TRADES|SURVEYOR|SOLICITOR], name, url, logoUrl, approved, clickCount)
AdSlot(id, partnerId, placement, model[CPM|CPC], rateGBP, active, impressions, clicks)
KycRecord(id, userId, provider, providerApplicantId, status, rawWebhookJson, passportCountry?, crn?, createdAt)  # retain 5 yrs
ComparableSale(id, postcodeDistrict, address, priceGBP, soldDate, propertyType, source)  # land registry ingest
AuditLog(id, actorUserId, action, entity, entityId, metaJson, createdAt)
```

### Conventions

- TypeScript strict; no `any` without a `// TODO(any):` justification.
- All business logic in `/services`; route handlers stay thin (validate → call service → respond). Validate every input with **Zod**.
- Server-side RBAC on every mutation (`requireRole()` helper). Never trust the client for role or KYC status.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`). One PR-sized commit per task.
- Every service gets unit tests; every user-facing flow in the week's checkpoint gets a Playwright test.
- Money: store as integer pence (`amountGBP` fields are pence, name kept for brevity) — never floats.
- Rate-limit all public POST endpoints (Upstash `@upstash/ratelimit`).

---

# SPRINT 1 (Weeks 1–2) — Foundation & Core Infrastructure

**Sprint goal:** A deployed skeleton: auth with 4 roles, complete DB schema, design system, admin shell, CI/CD.

## 👤 SPRINT 1 — HUMAN TASKS (do these on Day 1–2 of Week 1; the build depends on them)

> Estimated total effort: ~3–4 hours at a computer + waiting on approvals. Paste every credential into `.env.local` and Vercel → Settings → Environment Variables as you go.

**H1.1 — Create the GitHub repo and connect Vercel** (~20 min)
1. github.com → New repository → `proplink-uk`, private.
2. vercel.com → sign up/log in with GitHub → Add New Project → import `proplink-uk` (framework preset: Next.js) → Deploy.
3. Vercel → Project → Settings → Environment Variables: this is where every key from the tasks below gets pasted (add to Production + Preview + Development).
4. Stay on the free Hobby plan during development; upgrade to **Pro (~£16/mo)** before commercial launch (Hobby is non-commercial only).

**H1.2 — Create the Supabase project** (~15 min)
1. supabase.com → New project → name `proplink-uk`, region **London (eu-west-2)**, generate a strong DB password and save it in a password manager.
2. Project Settings → Database → Connection string: copy the **pooled** URI → `DATABASE_URL`; copy the **direct** URI → `DIRECT_URL`.
3. Stay on the Free plan for now; upgrade to **Pro ($25/mo)** in Week 11 before launch. (Claude Code will enable PostGIS via migration — nothing to click.)

**H1.3 — Register the domains** (~15 min, ≈£25/yr)
1. At a registrar (Cloudflare Registrar or Namecheap recommended): buy `proplink.co.uk` and `proplink.com` (or your final brand name — decide it now, renaming later is painful).
2. Do **not** point DNS at Vercel yet — that happens at launch (H6.5). You WILL add Resend's email DNS records here in H1.7.

**H1.4 — AWS account, S3 bucket and CloudFront** (~40 min)
1. aws.amazon.com → create account → immediately enable MFA on the root user.
2. IAM → Users → Create user `proplink-app` → attach an inline least-privilege policy allowing `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `arn:aws:s3:::proplink-media-prod/*` → Create access key (type: application) → save `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`.
3. S3 → Create bucket `proplink-media-prod`, region **eu-west-2**, Block all public access = ON.
4. CloudFront → Create distribution → origin = the bucket → Origin access control (OAC) → create → copy the policy CloudFront offers into the bucket policy → default cache behaviour is fine.
5. Save `AWS_REGION=eu-west-2`, `S3_BUCKET=proplink-media-prod`, `CLOUDFRONT_URL=https://<dist-id>.cloudfront.net`.
6. Billing console → Budgets → create a £20/month budget with email alert.

**H1.5 — Upstash Redis** (~10 min)
1. console.upstash.com → Create Database → name `proplink`, region closest to eu-west (e.g. Ireland), TLS on.
2. Copy `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. Free tier is fine for the whole build.

**H1.6 — Google Cloud project + OAuth credentials (for Google login)** (~20 min)
1. console.cloud.google.com → New Project → `proplink-uk` → enable billing (card required; nothing is charged yet).
2. APIs & Services → OAuth consent screen → External → fill app name + support email → save & publish.
3. Credentials → Create Credentials → OAuth client ID → Web application → Authorised JavaScript origins: `http://localhost:3000` + your Vercel URL; Authorised redirect URIs: same hosts + `/api/auth/callback/google`.
4. Save `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`. (Maps/Geocoding/Routes APIs are enabled later — H2.2 and H3.1.)

**H1.7 — Resend (transactional email)** (~15 min + DNS propagation)
1. resend.com → sign up → Domains → Add domain (your `.co.uk`) → it shows DKIM/SPF records.
2. At your registrar (H1.3), add those DNS records; wait for "Verified".
3. API Keys → create → `RESEND_API_KEY`. Until the domain verifies, dev emails can use Resend's onboarding sender.

**H1.8 — Sentry** (~10 min)
1. sentry.io → create org + project (platform: Next.js) → copy the DSN → `SENTRY_DSN`. Free Developer tier is fine until launch.

**H1.9 — Anthropic API key** (~10 min)
1. console.anthropic.com → API Keys → create key → `ANTHROPIC_API_KEY`.
2. Settings → Limits/Billing → set a **monthly spend cap** (suggest $50 during the build) and a usage alert.

**H1.10 — ⚠️ START THE LONG-LEAD ITEMS TODAY (Day 1)**
1. **Sumsub (KYC)** — the #1 schedule risk. sumsub.com → Sign up / request access → complete their business onboarding questionnaire (they KYB-verify *your* company: expect to provide company details/registration). Sandbox access usually arrives fast; **production approval can take weeks**, which is why this starts in Week 1 even though integration is Week 7.
2. **EPC Register API key** — epc.opendatacommunities.org → register (free) → key arrives by email → `EPC_API_KEY`.
3. **Companies House API key** — developer.company-information.service.gov.uk → create account → Create an application (live) → copy the REST key → `COMPANIES_HOUSE_API_KEY`.

✅ *Sprint 1 human tasks complete when:* every env var above (except Sumsub/Stripe/Pusher/Maps, which come in later sprints) is filled in `.env.local` and Vercel; Sumsub, EPC and Companies House applications submitted.

## 🤖 WEEK 1 — Project foundation, database, auth started

**Task 1.1 Project setup** *(Mon–Tue)*
- Init Next.js 15 + TS strict + Tailwind with the design tokens above; ESLint + Prettier; repo structure as specified; `.env.example`.
- GitHub Actions: typecheck + lint + `vitest` + `playwright` on PR; Vercel preview deploys.
- Sentry client/server init behind `SENTRY_DSN`.
- ✅ *Accepts:* CI green on a hello-world PR; preview URL deploys; brand tokens visible on a styled landing page.

**Task 1.2 Database & Prisma** *(Tue–Thu, dep: 1.1, H1.2)*
- Enable PostGIS (`create extension postgis; create extension pg_trgm;` via migration).
- Implement the FULL schema above in `schema.prisma` (use `Unsupported("geography(Point,4326)")` + raw SQL migration for the geo column, GIN index on `searchVector`, GIST index on `location`).
- `prisma/seed.ts`: 4 users (one per role, password `Password123!`), 3 agent profiles.
- ✅ *Accepts:* `prisma migrate dev` clean; seed runs; a raw `ST_DWithin` query returns rows in a test.

**Task 1.3 Auth & RBAC — part 1** *(Thu–Fri, dep: 1.2, H1.6)*
- Auth.js: credentials (bcrypt) + Google provider; registration with role selection (Agent / Investor / Buyer; Admin via seed only); login/logout; JWT sessions carrying `role` + `kycStatus`.
- ✅ *Accepts:* all 3 self-serve roles can register and log in on the preview deploy.

**🏁 Week 1 checkpoint (Friday):** repo deployed on Vercel with CI, full schema migrated on Supabase with PostGIS verified, basic register/login working, all Sprint 1 human tasks done.

## 🤖 WEEK 2 — Auth complete, design system, admin shell

**Task 1.4 Auth & RBAC — part 2** *(Mon–Tue, dep: 1.3, H1.7)*
- Email verification via Resend; password reset flow.
- Middleware: route groups `/agent/**`, `/investor/**`, `/admin/**` gated by role; `requireRole()` + `requireKyc()` server helpers.
- GDPR: consent checkbox (stored `gdprConsentAt`), cookie banner, `/privacy` and `/terms` placeholder pages, `DELETE /api/me` erasure endpoint (anonymises user, preserves KycRecord per retention rule).
- ✅ *Accepts:* Playwright: register→verify→login for each role; wrong-role access to `/admin` returns 403 page; erasure endpoint anonymises.

**Task 1.5 Layout, design system & metrics strip** *(Tue–Thu)*
- Global nav (role-aware links to the 5 portals), footer, KYC status pill in navbar (reads `user.kycStatus`).
- Global metrics strip component: Total Distress Inventory (sum of live listing prices), Completed Syndicate Deals, Accrued Success Fees (inc. VAT), Vetted Referrals Routed — server-computed, cached 60s in Redis.
- UI primitives: Button, Card, Input, Select, MultiSelect (for distress tags), Badge (EPC A–G colour-coded), Modal, Toast, DataTable, ProgressBar.
- ✅ *Accepts:* demo route `/dev/ui` renders all primitives; metrics strip shows seeded values.

**Task 1.6 Admin shell** *(Thu–Fri, dep: 1.4)*
- `/admin`: users table (search, role filter, deactivate), placeholder tabs for Moderation, KYC Queue, Fees, Ads.
- AuditLog written on every admin mutation.
- ✅ *Accepts:* admin can deactivate a user; audit row created.

**🏁 Week 2 checkpoint / Sprint 1 Definition of Done:** deployed to Vercel; all 4 roles can register/login with RBAC enforced; schema migrated; CI enforces tests; design system + metrics strip in place; admin shell live.

---

# SPRINT 2 (Weeks 3–4) — Agent Portal & Listing Engine

**Sprint goal:** Agents create rich distressed listings; admin approves; public detail page v1.

## 👤 SPRINT 2 — HUMAN TASKS (do early in Week 3)

**H2.1 — S3 CORS for browser uploads** (~10 min)
1. Ask Claude Code for the exact CORS JSON for the upload flow (it will produce it as part of Task 2.1).
2. AWS console → S3 → `proplink-media-prod` → Permissions → Cross-origin resource sharing (CORS) → paste the JSON (allows PUT/POST/GET from `http://localhost:3000`, `https://*.vercel.app`, and your production domain) → Save.

**H2.2 — Enable the Geocoding API + create the server Maps key** (~10 min)
1. Google Cloud console → APIs & Services → Library → enable **Geocoding API**.
2. Credentials → Create credentials → API key → Restrict: API restrictions = Geocoding API (Routes API gets added in H3.1); Application restriction = IP addresses (add your dev IP; add Vercel egress later or leave unrestricted for previews and restrict at launch).
3. Save as `GOOGLE_MAPS_SERVER_KEY`.
4. Billing → Budgets & alerts → create a **£20 budget** on the project with alerts at 50/90/100%. Remember: the old $200/month credit no longer exists — only per-SKU free caps.

**H2.3 — Provide brand assets** (~30 min)
1. Supply a logo (SVG preferred + PNG fallback) and a square favicon/app icon (512×512), or ask Claude Code to generate a simple wordmark placeholder.
2. Confirm the navy/blue palette in this doc or provide overrides now — restyling later costs time.

**H2.4 — Begin beta-agent recruitment** (ongoing from now until launch)
1. Write a one-page pitch: "list your distressed stock free during beta; verified profile + investor audience at launch."
2. Approach 5–10 agents/auction houses dealing in distressed or probate stock (the pre-launch checklist needs **≥10 agents with live listings**).
3. Keep a simple tracker (name, firm, status, stock volume); warm leads get staging access in Week 12 (H6.5).

## 🤖 WEEK 3 — Uploads & the listing engine

**Task 2.1 S3 upload service** *(Mon–Tue, dep: H1.4, H2.1)*
- Presigned-POST endpoint (auth required, content-type + size validation: images ≤10MB, PDFs ≤20MB); CloudFront URLs stored.
- Reusable `<ImageUploader max={20}>` with drag-drop, previews, sort order. Output the CORS JSON for H2.1.
- ✅ *Accepts:* upload 20 images; reorder persists; invalid types rejected server-side.

**Task 2.2 Multi-step listing form** *(Tue–Fri, dep: 2.1, H2.2)*
- Steps: (1) Address & location — postcode lookup → lat/lng geocode (Google Geocoding, cache in Redis); (2) Details — type, bedrooms, description, asking price (pence), target ROI %; (3) Distress tags multi-select (all 8) + "post-survey pricing safeguard" confirmation checkbox (GDPR-compliant wording); (4) Media — photos, EPC cert upload + manual rating A–G, floor plan; (5) Review → Save Draft or Submit for Review.
- Server: Zod-validated create/update; sets `searchVector` via trigger or on-write SQL; sets `location` from lat/lng.
- Listing statuses: DRAFT → PENDING_REVIEW → LIVE → UNDER_OFFER → SOLD (agent can move LIVE→UNDER_OFFER→SOLD; only admin can approve to LIVE).
- Enforce `Subscription.listingLimit` (default free tier: 3 live listings — real tiers arrive in Week 10).
- ✅ *Accepts:* Playwright: agent completes all steps, submits; listing appears in admin queue; limit blocks a 4th live listing.

**🏁 Week 3 checkpoint (Friday):** an agent can create a complete draft listing with photos, EPC, floor plan and distress tags, and submit it for review.

## 🤖 WEEK 4 — Moderation, profiles, detail page, seed data

**Task 2.3 Admin moderation queue** *(Mon, dep: 2.2)*
- `/admin/moderation`: pending listings with full preview, Approve / Reject (reason required → emailed to agent via Resend).
- ✅ *Accepts:* approve → status LIVE + `publishedAt` set + agent notified; reject → back to DRAFT with reason.

**Task 2.4 Agent profile & credibility hub** *(Tue–Wed)*
- Public `/agents/[id]`: agency info, star rating (avg of Appraisals), **Verified Completed Deals** counter (count of SOLD listings), compliance code, Case Studies CRUD (capex, net margin), Investor Appraisals (only users with a prior Enquiry/Deal on that agent's listings may review).
- Multi-profile switching: agent user can own several AgentProfiles; active profile selector in agent nav.
- ✅ *Accepts:* case study renders with capex/margin; unqualified user cannot post an appraisal (server-enforced).

**Task 2.5 Property detail page v1** *(Wed–Thu, dep: 2.2)*
- `/marketplace/[id]` (SSR, SEO meta + OpenGraph): gallery, distress tag chips (warning colour), EPC badge, price, target ROI, static map pin, satellite view embed, agent card, **Post Enquiry** form → creates Enquiry + emails agent.
- Placeholder sections (labelled "coming online in a later week"): comparables, price history.
- ✅ *Accepts:* Lighthouse SEO ≥ 90 on detail page; enquiry lands in agent's lead list + email.

**Task 2.6 Agent leads & analytics v1** *(Thu–Fri)*
- `/agent/leads`: all enquiries across the agent's listings, status management.
- Listing analytics: view counter (increment on detail-page view, dedupe per session), saves count.
- ✅ *Accepts:* view count increments once per session; lead status changes persist.

**Task 2.7 Seed data** *(Fri)* — extend seed: **40 realistic distressed listings** across UK cities (varied tags, EPC ratings, prices £45k–£450k, real-ish postcodes with lat/lng), 3 case studies, 5 appraisals.

**🏁 Week 4 checkpoint / Sprint 2 Definition of Done:** full agent journey (create → approve → live → enquiry) passes E2E; 40 seeded listings browsable.

---

# SPRINT 3 (Weeks 5–6) — Search, Map & Commute Engine

**Sprint goal:** The discovery layer: filtered FTS search, map with density view, commute filtering.

## 👤 SPRINT 3 — HUMAN TASKS (do before Week 6 starts)

**H3.1 — Enable Maps APIs + create the browser key + quotas** (~20 min)
1. Google Cloud console → APIs & Services → Library → enable: **Maps JavaScript API**, **Places API (New)**, **Routes API**.
2. Credentials → Create credentials → API key (this is the **browser** key) → Application restriction = **HTTP referrers**: `http://localhost:3000/*`, `https://*.vercel.app/*`, `https://yourdomain.co.uk/*` → API restrictions = Maps JavaScript API + Places API (New) → save as `GOOGLE_MAPS_API_KEY`.
3. Edit the **server** key from H2.2 → add **Routes API** to its API restrictions (it now covers Geocoding + Routes).
4. Quotas: APIs & Services → Routes API → Quotas → cap Compute Route Matrix elements per day (suggest 5,000/day to start). Repeat sensible caps for map loads.
5. Confirm the £20 budget alert from H2.2 still fits; raise to £50 with alerts if you expect heavier testing.

**H3.2 — Vercel Cron availability** (~5 min)
1. Vercel dashboard → your project → Settings → Cron Jobs: confirm crons are available on your plan (Hobby allows limited daily crons; Pro is fine). The cron config itself ships as code in Task 3.5.

## 🤖 WEEK 5 — Search core

**Task 3.1 SearchService (interface-first)** *(Mon–Wed)*
- `SearchService.search(params): Promise<SearchResult>` — implementation `PostgresSearchService`. Params: `q` (FTS + trigram fallback), `maxPrice`, `epcBands[]`, `region`, `propertyType`, `minBedrooms`, `minRoi`, `distressTags[]` (ANY match), `bbox` or `centre+radiusKm` (PostGIS), `sort` (newest | price | roi | relevance), pagination.
- Real-time result count endpoint (debounced from UI).
- ✅ *Accepts:* unit tests cover each filter + combinations; p95 query < 150ms on seeded data (use `EXPLAIN ANALYZE` sanity check).

**Task 3.2 Search UI** *(Wed–Fri, dep: 3.1)*
- `/marketplace`: filter sidebar (budget slider, EPC multi, distress tag chips, type, beds, min ROI), text box, live count, results grid of PropertyCards (photo, price, tags, EPC, ROI, distance/commute placeholder), URL-synced params (shareable searches).
- ✅ *Accepts:* Playwright: applying each filter narrows results; URL restore reproduces the search.

**🏁 Week 5 checkpoint (Friday):** every filter combination returns correct results through a polished search page with live counts and shareable URLs.

## 🤖 WEEK 6 — Map, commute engine, saved searches

**Task 3.3 Map view & density grid** *(Mon–Tue, dep: 3.1, H3.1)*
- Toggle List / Map. Google Maps JS: clustered markers from bbox search (viewport-driven refetch), marker → mini card → detail.
- Distress **density heatmap** layer: server aggregates counts by postcode district (PostGIS), rendered as weighted heatmap; city-level density metrics panel.
- Cost control: static map on detail pages; JS map only on `/marketplace`; lazy-load the Maps script.
- ✅ *Accepts:* panning refetches within 500ms debounce; heatmap toggle works; no Maps script loaded on non-map pages.

**Task 3.4 Commute Travel-Time Engine** *(Wed–Thu, dep: 3.3)*
- UI: destination hub autocomplete (Places), mode toggle (transit/drive), max-time slider (10–120 min).
- Server `MapsService.commuteFilter(candidateIds, hub, mode, maxMinutes)`:
  - Take top ≤ 25 candidates from the current search (Routes API `computeRouteMatrix` bills **per element** — cap elements per request).
  - **Redis cache** keyed `commute:{propertyId}:{hubPlaceId}:{mode}` TTL 7 days.
  - Return duration per property; filter + annotate cards ("32 min to hub").
- Daily quota guard: counter in Redis; if exceeded, degrade gracefully to straight-line distance with a notice.
- ✅ *Accepts:* second identical query hits cache (assert zero external calls in test via mocked client); quota breach degrades without error.

**Task 3.5 Saved searches & alerts** *(Fri, dep: H3.2)*
- Save property (heart), `/saved` list; Save Search with `alertsEnabled`; daily cron (Vercel Cron) emails new matches via Resend.
- ✅ *Accepts:* cron run emails only new-since-last-run matches (idempotent).

**🏁 Week 6 checkpoint / Sprint 3 Definition of Done:** a buyer/investor can find a property by text, filters, map and commute time; Maps costs guarded by cache + quota; alerts flowing.

---

# SPRINT 4 (Weeks 7–8) — Investor Portal, KYC & Syndicates (EOI mode)

**Sprint goal:** KYC-gated investors pledge into syndicate projects and track refurbs. **No real money moves.**

## 👤 SPRINT 4 — HUMAN TASKS (H4.1 must be done before Task 4.1 can integrate; start Monday of Week 7)

**H4.1 — Configure the Sumsub sandbox** (~45 min; requires the H1.10 application to have been accepted)
1. Log in to the Sumsub dashboard (sandbox mode).
2. Dev Space → App tokens → generate → save `SUMSUB_APP_TOKEN` + `SUMSUB_SECRET_KEY`.
3. Verification levels → create level `proplink-investor` with steps: **Identity document** (allow Passport; UK + international) + **Selfie / liveness**.
4. Dev Space → Webhooks → add endpoint `https://<your-vercel-domain>/api/webhooks/sumsub` → subscribe to applicant review events (`applicantReviewed`, `applicantPending`) → copy the secret → `SUMSUB_WEBHOOK_SECRET`.
5. Run one sandbox applicant yourself end-to-end using Sumsub's test documents; verify you can trigger both an approve and a reject.
6. Diary note: chase **production** approval status weekly — needed for H6.5.

**H4.2 — Create the Pusher app** (~10 min)
1. pusher.com → sign up → Channels → Create app → name `proplink`, cluster **eu**, tech stack React/Node.
2. App Keys → copy `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, and set `PUSHER_CLUSTER=eu`. Free Sandbox plan is fine until launch.

**H4.3 — Engage FCA counsel** (start this sprint; human-only, runs in parallel with the build)
1. Shortlist 2–3 UK law firms with FCA/fintech practices; request fixed-fee scoping calls.
2. Brief them precisely: "Property refurbishment syndication platform. Investors receive proportional equity in individual projects. Currently launching **Expression-of-Interest only — no client money is held or moved**. We need: (a) written confirmation the EOI launch model is outside the regulatory perimeter, (b) the authorisation or exemption route (CIS / AIFM / investment-based crowdfunding analysis), with costs and timeline, for enabling real capital pooling."
3. Budget: one-off structuring advice ~£5,000–£20,000; ongoing retainer ~£500–£1,500/month while pursuing authorisation. (FCA application fees themselves range £280–£222,940 across 10 categories, determined by the route counsel recommends.)
4. Ask counsel for the exact EOI wording required on the pledge screen and agreement text — hand it to Claude Code to replace the placeholder banner in Task 4.2.

## 🤖 WEEK 7 — KYC and syndicate pledging

**Task 4.1 KycService (interface + Sumsub + mock)** *(Mon–Wed, dep: H4.1, H1.10)*
- `KycService`: `createApplicant(user)`, `getSdkToken(user)`, `handleWebhook(payload)`. Implementations: `SumsubKycService` (sandbox) and `MockKycService` (auto-approve after 10s, used when keys absent).
- `/investor/kyc`: Sumsub WebSDK flow (passport OCR + liveness); optional CRN field for business investors → **Companies House API** lookup (free) validates and stores company name.
- Webhook route (signature-verified) updates `KycRecord` + `User.kycStatus`; Pusher event live-updates the navbar pill.
- `requireKyc()` enforced server-side on every pledge mutation.
- ✅ *Accepts:* sandbox applicant approve/reject both flow through webhook to UI without refresh; CRN `00000000` fails gracefully; unverified pledge attempt → 403 with "KYC required" response.

**Task 4.2 Syndicate projects & pledge flow** *(Wed–Fri, dep: 4.1, H4.2)*
- Admin/agent creates a SyndicateProject on a LIVE property: capital target, equity model notes, capital protection policy text.
- `/investor/syndicates`: browsable OPEN projects — property summary, target, funding bar (sum of PLEDGED), member count.
- Project page: **pledge flow** — amount input → live equity-share preview (`amount / max(target, totalPledged)`), agreement text + checkbox, confirm. Writes SyndicatePledge (PLEDGED). Prominent EOI banner: *"Expressions of interest only — no funds are collected at this stage."* (Replace with counsel's wording from H4.3 when received.)
- `SYNDICATE_PAYMENTS_ENABLED=false` guard: any code path that would create a Stripe charge for pledges must throw if flag is false.
- Target reached → status FUNDED, Pusher event to members, equity shares snapshotted.
- Withdraw pledge while project is OPEN.
- ✅ *Accepts:* Playwright: 3 investors pledge £20k/£25k/£20k to a £65k target → FUNDED, shares 30.77/38.46/30.77%; funding bar updates live via Pusher for a second browser context.

**🏁 Week 7 checkpoint (Friday):** an investor can complete sandbox KYC and pledge into a project; the funding bar moves live; unverified users are blocked server-side.

## 🤖 WEEK 8 — Refurb console, investor dashboard, lifecycle

**Task 4.3 Refurb progress console** *(Mon–Wed, dep: 4.2)*
- Members-only project dashboard: milestones CRUD (admin/agent adds, marks complete with notes), photo uploads per milestone (S3), **Capital & Expense Ledger** (EXPENSE / CAPITAL_INJECTION entries, itemised, running totals), future milestones tracker.
- All members see identical live state (Pusher on milestone/ledger changes).
- ✅ *Accepts:* non-member gets 403; ledger totals reconcile in a unit test; photo upload appears for a second member without refresh.

**Task 4.4 Investor dashboard** *(Wed–Thu)*
- `/investor`: KYC status card, active pledges with equity %, funding bars, portfolio totals; the four global metrics.
- ✅ *Accepts:* numbers match DB fixtures in tests.

**Task 4.5 Lifecycle to completion (data-level)** *(Thu–Fri)*
- Admin actions: FUNDED → IN_REFURB → LISTED → COMPLETED. On COMPLETED: log SuccessFee (configurable % + VAT), increment agent verified deal count, notify members (email + Pusher). Payout **calculation** displayed per member (no payment executed — EOI).
- ✅ *Accepts:* completing a project writes SuccessFee, bumps metrics strip, sends member emails.

**🏁 Week 8 checkpoint / Sprint 4 Definition of Done:** full investor journey — register → KYC → discover → pledge → track → completion accounting — with zero real payments and server-enforced gates.

---

# SPRINT 5 (Weeks 9–10) — AI Features, Stripe Billing & Buyer Portal

**Sprint goal:** The four Claude-powered differentiators, real revenue rails for agents, and the buyer journey.

## 👤 SPRINT 5 — HUMAN TASKS (H5.1 must be done before Task 5.6; start it Monday of Week 9)

**H5.1 — Stripe account, verification and products** (~45 min + verification wait)
1. stripe.com → create account → complete UK business verification: business type (ltd company or sole trader), company number, directors, and the bank account for payouts. Verification can take a day or two — start early.
2. Stay in **Test mode** for the whole build.
3. Product catalogue → create recurring products: **Starter £49/mo**, **Pro £149/mo**, **Elite £399/mo**; plus one-off product **Listing Boost £19**. Copy each `price_...` ID and paste them into `/docs/BLOCKERS.md` or hand directly to Claude Code.
4. Developers → API keys → copy test `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
5. Install the Stripe CLI locally; run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`; copy the printed signing secret → `STRIPE_WEBHOOK_SECRET`.

**H5.2 — Anthropic production readiness** (~10 min)
1. console.anthropic.com → check your rate-limit tier is sufficient for launch traffic (request an increase if needed).
2. Raise the monthly spend cap for launch (suggest $200/mo) and set alert thresholds. Set `AI_MONTHLY_BUDGET_GBP` in Vercel to match.

**H5.3 — Confirm the commercial decisions Claude Code cannot make** (~15 min)
1. Final subscription tier prices (defaults above), listing limits per tier, boost price/duration.
2. Success-fee percentage + VAT treatment (suggested default: 1–2% + VAT — confirm with your accountant).
3. Communicate the decisions to Claude Code before Task 5.6 begins.

## 🤖 WEEK 9 — The AI layer

**Task 5.1 AiService foundations** *(Mon, dep: H1.9)*
- `/services/ai`: Anthropic client, model router (`sonnet-4-6` vs `haiku-4-5`), Redis response cache (key = hash(feature, inputs), TTL 24h), per-user rate limit (e.g. 30 AI calls/day), monthly spend counter with hard stop env `AI_MONTHLY_BUDGET_GBP`.
- ✅ *Accepts:* identical request served from cache (no API call in mocked test); budget breach returns friendly 429.

**Task 5.2 AI Investment Advisor** *(Tue–Wed, dep: 5.1)*
- `/investor/ai-scout`: streaming chat (Vercel AI SDK or manual SSE) on `claude-sonnet-4-6` with **tool use**: `search_listings(params)` (calls SearchService) and `get_listing(id)`. System prompt includes ROI context + HMO permitted-development bounds; suggested query chips; **RICS disclaimer** rendered under every response.
- Prompt caching: cache the static system context block.
- ✅ *Accepts:* "Find me a 3-bed project in Worcester with high renovation ROI" returns real seeded listings as cards; disclaimer always visible.

**Task 5.3 AVM (Automated Valuation Model)** *(Wed–Thu, dep: 5.1)*
- `/jobs/ingest-landregistry.ts`: import Land Registry Price Paid data (free) for seeded postcode districts into ComparableSale (~last 5 years).
- `MarketDataService.getComparables(postcode, type, radius)`; AVM endpoint: comparables + property details → Sonnet reasoning → `{ currentEstimate, postRehabGDV, structuralCapexEstimate, confidence, comparablesUsed[] }` (JSON mode). Cache per property 7 days.
- Detail page: valuation card + comparables table + RICS disclaimer (replaces Week-4 placeholder).
- ✅ *Accepts:* estimate within a sane band of comparables median in tests (mock model, real math on comparables); GDV > current estimate for renovation-tagged stock.

**Task 5.4 AI Listing Enhancer** *(Fri, dep: 5.1)*
- In the listing form: "Enhance with AI" → `haiku-4-5` generates professional description from structured inputs; auto-suggests distress tags from free text (agent confirms); quality score 0–100 with improvement hints shown on submission.
- ✅ *Accepts:* returns ≤200-word description + valid tag suggestions as structured JSON; agent can accept/edit.

**🏁 Week 9 checkpoint (Friday):** Advisor chat, AVM valuations and the Listing Enhancer are all live against seeded data, with caching, rate limits and the spend cap active.

## 🤖 WEEK 10 — Planning tool, Stripe revenue, buyer portal

**Task 5.5 AI Town Planning Probability Tool** *(Mon, dep: 5.1)*
- `/intel/planning-probability`: inputs (property type, council area, proposed development) → Sonnet returns probability band + reasoning + comparable considerations; banner: pre-app estimate only, not official guidance.
- ✅ *Accepts:* structured output validates against Zod schema; disclaimer present.

**Task 5.6 Stripe billing** *(Tue–Wed, dep: H5.1, H5.3)*
- Agent tiers via Stripe Billing: STARTER £49/mo (5 live listings), PRO £149/mo (25 + analytics), ELITE £399/mo (unlimited + priority placement) — use the price IDs from H5.1. Checkout Session → webhook (`checkout.session.completed`, `customer.subscription.updated|deleted`) → Subscription row + `listingLimit`.
- Listing **Boost**: one-off Stripe payment (£19/7 days) → boosted flag ranks first in search.
- Success-fee hook: fee engine already logs on completion (Week 8) — surface in `/admin/fees` with CSV export.
- Customer portal link for agents to manage billing.
- ✅ *Accepts:* Stripe CLI webhook tests drive tier changes; downgrade below live-listing count blocks correctly; boost affects ordering.

**Task 5.7 Buyer portal & deal flow** *(Wed–Fri)*
- `/buy`: standard search preset (distress filters collapsed), affordability calculator (deposit, income multiple, rate, term → budget check vs asking price), historical price data viewer per postcode (ComparableSale chart), mortgage calc + DIP outbound link.
- **In-app chat** buyer↔agent per property (Pusher private channels, persistence in ChatMessage, unread badges).
- **Viewing booking**: buyer requests slots; agent confirms/declines; both see calendar list; emails on changes.
- **Digital offer**: submit amount → agent Accept/Reject → on accept, Deal created; **Deal Tracker** stepper: Offer Accepted → Solicitor Referred (links to ecosystem partners) → Conveyancing → Exchanged → Completed (agent updates; buyer read-only; emails on stage change). Completion logs SuccessFee.
- ✅ *Accepts:* E2E: buyer chats, books viewing, offers, agent accepts, deal advances to COMPLETED, fee logged.

**🏁 Week 10 checkpoint / Sprint 5 Definition of Done:** all 4 AI features live with cost guards; agents pay real (test-mode) subscriptions; complete buyer journey on-platform.

---

# SPRINT 6 (Weeks 11–12) — Intelligence, Marketplace, QA, Security & Launch

**Sprint goal:** Finish intelligence + monetisation modules, then harden, test, and ship.

## 👤 SPRINT 6 — HUMAN TASKS (H6.2 has 2–4 weeks lead time — book it at the START of the sprint or earlier)

**H6.1 — ICO registration (legal requirement before processing real user data at launch)** (~20 min, £52)
1. ico.org.uk → "Data protection fee" → run the self-assessment (you are almost certainly **Tier 1**: ≤10 staff or ≤£632k turnover → £52/year, £47 by direct debit).
2. Register as a data controller, pay the fee, save the registration number.
3. Give the registration number to Claude Code to display in the site footer and Privacy Policy.

**H6.2 — Book the penetration test** (booking ~30 min; lead time 2–4 weeks; test £4,000–£12,000)
1. Contact 2–3 **CREST-accredited** UK firms; request a scoping call for "a Next.js web application with payments (Stripe), KYC (Sumsub), and role-based portals."
2. Expect a quote around £4k–£12k for medium complexity; be suspicious of quotes under ~£3k (automated scans, not real testing).
3. Provide the staging URL + test accounts for each role; schedule the test for Week 12 or immediately post-launch; reserve a remediation window after the report.

**H6.3 — Final Privacy Policy, Terms of Service and Cookie Policy** (legal)
1. Instruct your solicitor (or a reputable UK legal-template service) to produce final GDPR-compliant Privacy Policy, ToS (covering agents, investors — including EOI syndication language from H4.3 — and buyers) and Cookie Policy.
2. Hand the final text to Claude Code to place on `/privacy`, `/terms`, `/cookies` (replacing Week-2 placeholders).

**H6.4 — Google Workspace for support/admin email** (~15 min, ~£10–14/mo for 2 seats)
1. workspace.google.com → Business Starter → 2 seats → verify your domain (TXT record at the registrar) → add MX records.
2. Create `support@` and `admin@` mailboxes; give the support address to Claude Code for the contact page and transactional reply-to.

**H6.5 — Production cutover checklist** (Week 12 Thu–Fri, ~1–2 hrs, do alongside Task 6.7)
1. **DNS:** Vercel → project → Settings → Domains → add `yourdomain.co.uk` + `www` → add the records Vercel shows at your registrar.
2. **Vercel Pro:** upgrade the team to Pro (commercial use) and enable Spend Management alerts.
3. **Supabase Pro:** upgrade the project ($25/mo); confirm daily backups are on; run the restore drill from Claude Code's `/docs/runbook.md`.
4. **Stripe live:** complete activation, recreate the products/prices in Live mode, swap live keys + a live webhook endpoint in Vercel env.
5. **Sumsub production:** if approved, swap production keys and re-point the webhook; if not yet approved, leave sandbox and tell Claude Code to enable the "verification opening soon" gate.
6. **Google Maps:** restrict the browser key's referrers to the live domain; confirm quotas + budget alerts.
7. **Anthropic:** confirm the launch spend cap (H5.2).
8. **Beta UAT:** give 3 beta agents + 2 beta investors staging access (from H2.4 recruitment); collect feedback in a shared doc; triage blockers with Claude Code.
9. **Alerts everywhere:** AWS budget, Google Cloud budget, Vercel spend, Stripe email notifications, Sentry alert rules.

## 🤖 WEEK 11 — Intelligence, ecosystem, performance

**Task 6.1 Market Intelligence module** *(Mon–Tue, dep: H1.10 EPC key)*
- EPC Register API integration: auto-fetch EPC by address/postcode during listing creation (agent confirms).
- Area intelligence on detail pages + `/intel`: price history chart (ComparableSale), area value trend by district, **EPC uplift model** — estimated value increase per EPC band improvement (rule-based from comparables + configurable coefficients, labelled estimate).
- ✅ *Accepts:* known sandbox postcode auto-fills EPC; charts render from ingested data.

**Task 6.2 Planning research feed** *(Tue–Wed)*
- `MarketDataService.getPlanningApplications(postcode)` from planning.data.gov.uk (+ per-council fallbacks where available), cached 24h; feed on detail pages + `/intel/planning`: recent decisions, approved extensions, permitted development outcomes. Graceful "no data for this council" state.
- ✅ *Accepts:* covered postcode shows results; uncovered postcode shows graceful state; all responses cached.

**Task 6.3 Ecosystem marketplace & ads** *(Wed–Thu)*
- `/ecosystem`: partner directory by category, click-through tracking (`clickCount`), admin partner approval flow.
- Ad slots: sponsored placements (search results row 4 + detail sidebar), CPM/CPC counters, monthly billing summary per partner via Stripe invoice, `/admin/ads` campaign dashboard. *(Cut-first scope if time pressure: keep directory + clicks, defer billing.)*
- ✅ *Accepts:* impressions/clicks tally correctly (dedupe per session); sponsored row labelled "Sponsored".

**Task 6.4 Performance** *(Thu–Fri)*
- `next/image` everywhere, blur placeholders; route-level code splitting; Redis caching on metrics/search-count; CloudFront cache headers on media; DB index audit (`EXPLAIN` on top 10 queries).
- ✅ *Accepts:* Lighthouse ≥ 90 (Performance & SEO) on home, marketplace, detail; p95 API < 300ms locally.

**🏁 Week 11 checkpoint (Friday):** every module of the platform is functionally complete; performance targets hit.

## 🤖 WEEK 12 — Security, QA, UAT, go-live

**Task 6.5 Security hardening & GDPR closeout** *(Mon–Tue, dep: H6.1, H6.3)*
- OWASP pass: security headers (CSP, HSTS, frame-deny), CSRF posture review, Zod on 100% of inputs (audit), IDOR sweep (every `findUnique` scoped to owner/role), rate limits on auth + AI + enquiry + pledge endpoints, S3 bucket policy audit, webhook signature verification audit (Stripe, Sumsub, Pusher auth).
- Secrets scan; dependency audit (`npm audit` + Dependabot).
- Final Privacy Policy + ToS content in (from H6.3); cookie consent gating any analytics; data-export endpoint (`GET /api/me/export` → JSON of user's data); ICO registration number in footer (from H6.1).
- Automated daily Supabase backups verified + restore drill documented in `/docs/runbook.md`.
- ✅ *Accepts:* ZAP baseline scan: no High findings; IDOR tests pass; restore drill documented.
- *(The external professional penetration test from H6.2 runs this week or immediately post-launch.)*

**Task 6.6 Full QA & UAT** *(Tue–Thu, dep: H6.5 step 8 for beta users)*
- Unit coverage ≥ 70% on `/services`; Playwright suite covers: agent listing lifecycle, investor KYC+pledge, buyer offer→completion, admin moderation, billing webhooks.
- Mobile/tablet responsive QA across all portals; PWA manifest + icons (add-to-home-screen).
- Staging env with production-like seed; UAT script for 3 beta agents + 2 beta investors; fix log triaged (blockers only).
- ✅ *Accepts:* CI green with coverage gate; UAT blockers = 0.

**Task 6.7 Launch** *(Thu–Fri, dep: H6.5)*
- SEO: per-listing meta/OG, `sitemap.xml`, `robots.txt`, JSON-LD (`RealEstateListing`).
- Production env vars; Stripe live keys (subscriptions only); Sumsub production keys if approved, else keep provider in sandbox and gate investor pledges behind a "verification opening soon" state; Google Maps billing caps + alerts; Anthropic spend cap; Sentry release tagging.
- Seed partner agents' real listings; marketing landing page; analytics baseline (Vercel Analytics).
- ✅ *Accepts:* production smoke suite passes; monitoring dashboards live; rollback procedure documented.

**🏁 Week 12 checkpoint / Project Definition of Done:** production deployment serving real listings; every module of the master document either live or explicitly deferred (premium AVM data, native mobile, real syndicate payments pending FCA).

---

## Cross-Week Rules for Claude Code

1. **Never enable real syndicate payments.** The `SYNDICATE_PAYMENTS_ENABLED` flag stays false; write the Stripe pooling code path only as a guarded stub.
2. **Cache before you call.** Any Google Maps or Anthropic call must check Redis first and must be mockable in tests.
3. **Interfaces for externals.** Sumsub, Maps, AI, Search and Stripe are consumed only through `/services` interfaces with mock implementations — tests never hit live APIs.
4. **Every migration is additive** after Week 4 (no destructive changes without an explicit data-migration script).
5. **When blocked on a human task's output** (missing key, pending Sumsub approval, undelivered legal text), continue with the mock implementation and record the gap in `/docs/BLOCKERS.md` with the blocking human task ID (e.g. "waiting on H4.1") — do not stall the week. At the start of every week, print the current `/docs/BLOCKERS.md` so the human sees what they owe.
6. **End-of-week discipline:** each Friday, ensure the week's checkpoint passes, CI is green, and the preview deploy reflects the checkpoint before starting the next week's tasks.
7. **If a week runs over:** pull time from the designated cut-first scope (ad-slot billing → planning probability tool → PWA manifest), never from security, KYC gating or GDPR tasks.
8. **Deferred by design (do not build in these 12 weeks):** native mobile apps, Elasticsearch, premium AVM data licences (Hometrack), real capital movement, multi-language.

---

*Companion document: `PropLink_UK_Master_Document.docx` — project definition, consolidated workflows, final tech stack rationale, and the complete A-to-Z cost analysis (researched July 2026).*
