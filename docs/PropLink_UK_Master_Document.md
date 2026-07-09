# PropLink UK — Master Project Document

**Project Definition · Workflows · Technology Stack · Full A-to-Z Cost Analysis**

*Consolidated from: Property Portal Workflow Analysis · PropLink UK Development Plan · PropLink Full Project Plan v1.0 · PropLink Investor Workflow v1.0*

Version 2.0 · July 2026 · Pricing researched and verified July 2026 · Confidential

---

## Table of Contents

1. [What Is PropLink UK?](#1-what-is-proplink-uk)
2. [Module Architecture (A to Z)](#2-module-architecture-a-to-z)
3. [Complete Application Workflows](#3-complete-application-workflows)
4. [Final Technology Stack](#4-final-technology-stack)
5. [Development Phases → 3-Month Sprint Mapping](#5-development-phases--3-month-sprint-mapping)
6. [Compliance & Legal Requirements](#6-compliance--legal-requirements)
7. [Full A-to-Z Cost Analysis (researched July 2026)](#7-full-a-to-z-cost-analysis-researched-july-2026)
8. [Risk Register (updated)](#8-risk-register-updated)

---

## 1. What Is PropLink UK?

PropLink UK is a specialist, multi-sided property investment and transactions platform built for the UK **distressed property** market. It combines four things that today exist nowhere in one place: a **Distressed Asset Marketplace**, an **Investor Syndication Engine**, an **Agent Portal** with a verified credibility system, and a **Market Intelligence Toolkit** — all inside a single, web-first application.

Mainstream portals such as Rightmove and Zoopla follow a search → browse → enquire model and then push the entire transaction off-platform. PropLink UK closes that gap: it takes users all the way from discovery through due diligence, syndicate capital pooling, refurbishment tracking, and deal completion, keeping every stakeholder — agent, investor, and buyer — on one platform for the full transaction lifecycle. The platform earns revenue at every stage through agent subscriptions, listing boosts, success fees, advertising, and ecosystem partner referrals.

### 1.1 The problem being solved

| Problem | PropLink UK solution |
|---|---|
| **Fragmented market** | Distressed properties are scattered across auction sites, agents and word-of-mouth. PropLink provides a centralised, searchable UK distressed listings hub with distress tagging, EPC data, satellite view and a geospatial density grid. |
| **No investor infrastructure** | Investors pooling capital for refurbishment projects have no formal platform. The Syndicate Engine provides project pooling, equity-share models, a capital ledger and a refurbishment progress tracker in one dashboard. |
| **No intelligence layer** | Agents and investors rely on manual research. The Market Intelligence Module supplies area value data, comparable sales, EPC improvement modelling and planning data feeds automatically. |
| **Compliance gaps** | Automated KYC/AML background checks (passport + Companies House CRN) are enforced before any capital pooling action is authorised. |
| **Off-platform transactions** | An in-app deal tracker covers offer, solicitor referral, conveyancing milestones and success fee logging — fully on-platform. |
| **No agent credibility** | Verified case studies, completed deal counts, investor appraisals and compliance codes are displayed on every agent profile. |

### 1.2 Core user roles

| Role | Primary purpose | Key actions |
|---|---|---|
| Agent / Landlord | Supply side — list distressed properties | Upload listings, tag defects, manage portfolio, build verified profile |
| Investor | Capital side — find and fund projects | Search deals, pass KYC, pool capital into syndicates, track refurbs |
| Buyer / Retail | Demand side — purchase properties | Search, filter, calculate affordability, book viewings, submit offers |
| Admin | Platform governance | Moderate listings, monitor KYC, manage fees, ads and users |

### 1.3 The five portals

The application is a web-first React/Next.js platform with five portals sharing a unified navigation bar, a live KYC status indicator, and a global metrics strip (**Total Distress Inventory · Completed Syndicate Deals · Accrued Success Fees · Vetted Referrals Routed**). Each portal is a modular, independently scalable component tree with its own API endpoints and role-based access control.

| Portal | Primary users | Core purpose |
|---|---|---|
| 1. Marketplace | Buyers, Investors | Search and browse distressed UK property listings |
| 2. Investor Portal | Investors | Portfolio dashboard, syndicate pooling, KYC, deal tracking |
| 3. Agent Portal | Estate Agents | List distressed properties, manage leads, build credibility profile |
| 4. Market Intelligence | Agents, Investors | Area values, comparable sales, EPC data, planning research feeds |
| 5. Ecosystem Marketplace | All users | Partner directory: insurance, conveyancing, tradespeople, solicitors |

---

## 2. Module Architecture (A to Z)

PropLink UK is composed of 11 core modules grouped by portal, plus the cross-cutting authentication and admin layers. Every module feeds the core commercial loop: **agent lists property → investor finds and funds it → buyer purchases → platform logs a success fee.**

| # | Module | Scope |
|---|---|---|
| M0 | Authentication & User Management | Registration/login for all 4 roles, JWT sessions, role-based access control, password reset, email verification, multi-profile switching, admin user management. |
| M1 | Distressed Listings Search Engine | Full-text + geospatial search. Filters: max budget, EPC band, city/region, property type, bedrooms, minimum target ROI, and 8 distress types (Subsidence, Damp, Probate, Fire Damage, Water Damage, Asbestos, Renovation Needed, Roof Required). Results show entry price, target refurb ROI, commute time and EPC badge. |
| M2 | Commute Travel-Time Engine | Buyer sets a commute destination hub, travel mode (train/road) and a max-commute-time slider; results filter in real time. Powered by the Google Maps Routes API (Compute Route Matrix — note: the old Distance Matrix API is now Legacy). |
| M3 | Property Detail Page | Photo gallery, structured distress tags, EPC badge, satellite view embed, asking price, target ROI, map pin, comparable recent sales, and a Post Enquiry action routed to the listing agent. |
| M4 | KYC & AML Compliance Engine | Automated checks before any capital action: passport OCR + liveness, Companies House CRN validation, AML screening. Status stored per account and shown live in the nav bar. Records retained 5 years per UK AML rules. |
| M5 | Syndicate Pooling & Project Engine | Investors pool capital into a named project under pre-agreed equity-share models. Progress console shows asset target, funding bar, member count and pooling status. KYC required before activation. (Launches in Expression-of-Interest mode until FCA position is cleared — see Section 6.) |
| M6 | Refurbishment Capital Dashboard | Pooled capital, active projects, physical refurb milestones with photos and notes, itemised Capital & Expense Ledger (Expense / Capital Injection), and a Capital Protection Policy section. |
| M7 | Listing Engine (Agent) | Multi-step listing form: up to 20 photos, EPC upload with auto-rating fetch, floor plan, distress tag multi-select, distressed asking price, target ROI, GDPR-compliant post-survey pricing safeguards. Draft → admin approval → publish workflow. Status: draft / live / under offer / sold. |
| M8 | Agent Profile & Credibility Hub | Public profile: verified completed deals counter, compliance code, star rating, case study success stories (capex + net margin), verified investor appraisals, multi-profile switching. |
| M9 | Market Intelligence Module | Land Registry + EPC Register APIs auto-populate area values, comparable sales and EPC ratings on listing creation; price history charts; EPC improvement uplift modelling. |
| M10 | Planning Research Feed | Public council planning application data by address/postcode: recent decisions, approved extensions, permitted development outcomes. |
| M11 | Ecosystem Marketplace & Fee Engine | Partner directory (insurance, conveyancing, staging, tradespeople, surveyors, solicitors), sponsored placement via an advertising API with CPM/CPC billing, and a backend transaction hook logging a success fee on every completed deal. |

### 2.1 AI & intelligence features (the primary differentiator)

All AI features run on the **Anthropic API (Claude)**. Every valuation or planning output carries the RICS disclaimer: *AI valuations are statistical projections based on registry comparable databases and do not substitute for official RICS-qualified surveys or official planning guidance.*

| AI feature | What it does |
|---|---|
| AI Investment Advisor | Conversational scout embedded in the AI Toolkit tab. Natural-language queries ("Find me a 3-bed project in Worcester with high renovation ROI") answered with awareness of live listings, local ROI targets and HMO permitted development bounds. Suggested query chips included. |
| Automated Valuation Model (AVM) | Instant market value estimate, post-rehab GDV calculation and structural capex estimate, powered by free Land Registry open data (comparables) with Claude reasoning. Premium AVM data (e.g. Hometrack) can be added later. |
| AI Listing Enhancer | Auto-generates professional descriptions from agent inputs, auto-tags defect categories from free text, and assigns a listing quality score on submission. |
| AI Town Planning Probability Tool | Inputs: property type, location, council area, proposed development. Output: probability score for planning approval, clearly marked as a pre-app estimate only. |
| Smart Search Ranking | Results ranked by AI match score weighted on ROI fit, commute fit, price fit and defect preference match from investor intent history. |

---

## 3. Complete Application Workflows

PropLink runs two fundamentally different journeys side by side. The **buyer journey** is a single-person flow — one person searches, enquires and buys. The **investor journey** is a multi-user system — several investors pool money into the same project, share ownership, and track the refurbishment together until payout. They diverge at almost every step, which is why the investor side is a standalone workflow.

### 3.1 Buyer vs investor: why two workflows

| Stage | Buyer journey | Investor journey (separate) |
|---|---|---|
| Goal | Buy a home to live in | Fund a deal for financial return (ROI) |
| Identity checks | None required to enquire | Full KYC/AML before any capital moves |
| Who acts | One person, alone | Many investors pooling into one project |
| What they evaluate | Price, location, condition | ROI, refurb cost, GDV, planning odds |
| The transaction | Single purchase | Capital commitment + equity share on-platform |
| After the deal | Journey ends at purchase | Ongoing: track refurb, milestones, payout |
| Ownership | Sole owner | Shared equity split across the syndicate |

### 3.2 Investor / buyer journey — end to end

| Step | Action |
|---|---|
| 1 | **ENTRY** — Web app homepage with global KYC status bar and live metrics strip. Register and select the Investor (or Buyer) role. |
| 2 | **KYC / AML VERIFICATION** (mandatory gate for investors) — passport ID + Companies House CRN check via the KYC provider; KYC badge issued. No capital action is possible before this passes. |
| 3 | **BROWSE & DISCOVER** — search distressed listings; filter by distress type, EPC, budget, target ROI and commute radius; or browse by region on the geospatial density grid. |
| 4 | **PROPERTY DETAIL** — distress tags, entry price, target ROI, comparable sales, satellite view, EPC. Evaluate refurb capex, post-rehab GDV and risk. |
| 5 | **ACT** — three routes: Contact Agent (direct enquiry) · Join Syndicate (pool capital) · Solo Purchase (direct offer). |
| 6 | **COMMIT CAPITAL → JOIN SYNDICATE** — enter £ amount, see live equity-share preview, pool with other investors under the pre-agreed agreement. (Expression-of-Interest pledge until FCA clearance.) |
| 7 | **TRACK** — My Portfolio dashboard: active syndicates, capital ledger, refurb milestones with photos, deal progress. |
| 8 | **COMPLETION** — property sold / refurb complete → returns distributed by equity share → success fee logged → solicitor referral → verified deal added to records. |

### 3.3 Inside a syndicate — the multi-investor view

A single distressed property often needs more refurbishment capital than one investor wants to commit, so multiple investors pool into one project. Example: Investor A commits £20,000, Investor B £25,000, Investor C £20,000 → one shared project with £65,000 pooled capital, equity split by contribution (~31% / ~38% / ~31%). All members watch the same live dashboard — the same milestones, progress photos and capital & expense ledger — and returns are distributed by share on completion.

| Step | Syndicate lifecycle |
|---|---|
| 1 | **PROJECT OPENS FOR FUNDING** — agent lists a distressed property with a refurb capital target (e.g. £65,000). |
| 2 | **INVESTORS COMMIT** one by one — each commitment updates a shared funding progress bar (e.g. £35,000 / £65,000, 7 members). |
| 3 | **TARGET REACHED → SYNDICATE FORMED** — equity shares locked by contribution; capital protection policy applied. |
| 4 | **REFURB TRACKED** — milestones added and completed, progress photos uploaded per milestone, itemised expense ledger maintained. |
| 5 | **VALUE REASSESSED** — market intelligence re-runs comparables as works complete. |
| 6 | **LISTED FOR SALE** on the Marketplace. |
| 7 | **COMPLETION & DISTRIBUTION** — returns split by equity share, success fee auto-logged, deal added to completed counts. |

### 3.4 Agent journey

| Step | Action |
|---|---|
| 1 | **ONBOARDING** — account creation, subscription tier selection (Stripe), compliance code assigned. |
| 2 | **POST DISTRESS LISTING** — photos, EPC, floor plan, distress tags, price; market data auto-fills area values and EPC from the intelligence module; AI Listing Enhancer generates description and quality score. |
| 3 | **ADMIN APPROVAL** — draft reviewed and published via the moderation queue. |
| 4 | **MANAGE** — analytics (views, saves, enquiries), centralised lead manager, optional paid listing boosts. |
| 5 | **BUILD PROFILE** — case studies (capex + net margin), verified investor appraisals, completed deal counter. |
| 6 | **DEAL CLOSES ON PLATFORM** — success fee auto-logged, completed deal added to verified profile, ecosystem partners notified. |

---

## 4. Final Technology Stack

The source documents proposed slightly different stacks (Next.js API routes vs a separate Express server; Onfido vs Sumsub; Elasticsearch from day one). The table below is the **reconciled, final stack**, optimised for a 3-month build with Claude Code: one Next.js monorepo, managed services everywhere, and free tiers exploited during development. Decisions that changed from the earlier drafts are marked ►.

| Layer | Technology | Rationale / decision |
|---|---|---|
| Frontend | Next.js 15 (React, App Router) + TypeScript | SSR/SSG for listing-page SEO; fast client navigation; one codebase for all five portals. |
| Styling | Tailwind CSS + brand design tokens | White / Navy / Blue system (#002147, #003580, #0066FF, #F5F8FF); Calibri-equivalent web stack. |
| State | Zustand + TanStack Query | Light global state; server-state caching for listings and market data. |
| Backend | ► Next.js API Route Handlers + Server Actions (no separate Express server) | One deployable, one repo, faster for a 3-month build; modular service layer keeps it microservice-ready. Removes the need for Railway/Render hosting. |
| Database | PostgreSQL + PostGIS on Supabase Pro | Relational data + full geospatial query support; Supabase is cheaper than RDS at this stage and PostGIS is enabled with one command. Prisma ORM. |
| Search | ► Postgres full-text (tsvector) + pg_trgm + PostGIS for MVP; Elasticsearch/Meilisearch behind a service interface later | At MVP listing volumes (hundreds to low thousands) Postgres FTS is free and fast; the search service is abstracted so Elastic can be swapped in when volume demands it. |
| Cache / queues | Upstash Redis (pay-as-you-go) | Commute-result and AI-response caching (critical for controlling Google Maps and Anthropic costs), rate limiting, job queues. |
| File storage | AWS S3 + CloudFront CDN | Property photos, floor plans, EPC documents, refurb progress images via presigned uploads. |
| Auth | Auth.js (NextAuth v5) + JWT | Email/password + Google login; 4 roles (Agent, Investor, Buyer, Admin) with RBAC middleware; GDPR-compliant sessions. |
| AI | Anthropic API — Claude Sonnet 4.6 for the Advisor, AVM reasoning and planning tool; Claude Haiku 4.5 for listing enhancement and tagging; prompt caching + batch where possible | All four AI features. Model routing (Haiku for high-volume, Sonnet for reasoning) plus 90%-discounted cached input keeps costs low. |
| Maps | ► Google Maps Platform — Maps JS API + Routes API (Compute Route Matrix) | Property pins, density heatmap, commute engine, satellite embed. **NOTE:** Google retired the $200/month credit in March 2025 (per-SKU free caps now apply) and marked the Distance Matrix API as Legacy — new builds must use the Routes API. |
| Market data | HM Land Registry Price Paid / UK HPI + EPC Register API + Companies House API + planning open data | All free UK government / open data. Auto-populates valuations, comparables, EPC ratings and CRN checks. |
| KYC / AML | ► Sumsub (instead of Onfido) | Onfido is now Entrust-owned and enterprise/sales-led (contracts commonly $50k+/yr). Sumsub is self-serve from ~$149/month with per-check pricing (~$1.35–1.85), bundles AML screening, and can be in sandbox the same day. |
| Payments | Stripe (Billing for agent subscriptions; success-fee ledger hook; ad billing) | UK cards 1.5% + 20p. Syndicate money movement is NOT processed until FCA position is cleared — pooling launches in Expression-of-Interest mode. |
| Real-time | Pusher Channels | In-app chat, live syndicate funding updates, KYC status changes, notifications. Free Sandbox tier during development. |
| Email | Resend + React Email | Transactional email: verification, alerts, offers, enquiry routing. Free 3k/month during dev. |
| Hosting | Vercel Pro | Edge-deployed Next.js, preview deployments per PR, CI-friendly. |
| CI/CD | GitHub Actions + Vercel | Lint, typecheck, unit + E2E tests on every PR; auto preview deploys. |
| Monitoring | Sentry (+ Vercel Analytics) | Error tracking and performance; free Developer tier during the build, Team tier at launch. |
| Security | AES-256 at rest, TLS 1.3, OWASP hardening, rate limiting | GDPR-compliant encryption for financial data, KYC documents and contracts. |

---

## 5. Development Phases → 3-Month Sprint Mapping

The earlier plans described 3–5 phases without dates. For the 3-month Claude Code build, the phases compress into **six 2-week sprints**. The full sprint plan — with per-task acceptance criteria, week-by-week breakdowns and human-task instructions, written to be handed directly to Claude Code — is the separate companion document (`PropLink_Sprint_Plan_Claude_Code.md`).

| Sprint | Weeks | Theme and key output |
|---|---|---|
| Sprint 1 | Weeks 1–2 | **Foundation:** repo, CI/CD, design system, full database schema (PostGIS), Auth.js with 4 roles, admin skeleton, global metrics strip. |
| Sprint 2 | Weeks 3–4 | **Agent Portal:** multi-step listing engine with S3 uploads, distress tagging, draft → admin approval → publish, agent credibility profile, property detail v1, seed data. |
| Sprint 3 | Weeks 5–6 | **Search & Discovery:** filtered full-text + geospatial search, map view with density heatmap, commute travel-time engine (Routes API + caching), saved searches and alerts. |
| Sprint 4 | Weeks 7–8 | **Investor Portal:** Sumsub KYC sandbox integration with webhook status, KYC gating, syndicate engine in Expression-of-Interest mode, refurb milestones + capital/expense ledger, investor dashboard. |
| Sprint 5 | Weeks 9–10 | **AI + Payments + Buyer:** all 4 Claude features, Stripe agent subscription tiers + success-fee hook, buyer portal (affordability, price history, chat, viewings, offers, deal tracker). |
| Sprint 6 | Weeks 11–12 | **Intelligence, Monetisation & Launch:** Land Registry/EPC auto-fill, planning feed, ecosystem marketplace + ad slots, performance (Lighthouse 90+), security hardening, GDPR pages, full QA, staging UAT, go-live. |

> Gate rule carried over from the original plan: each sprint must be tested and reviewed before the next begins. The single highest-risk external dependency is **KYC provider onboarding** — the Sumsub application should be started in Week 1 even though integration happens in Sprint 4.

---

## 6. Compliance & Legal Requirements

### 6.1 GDPR / UK data protection

All personal data encrypted at rest and in transit (AES-256 / TLS 1.3); explicit consent at registration; right-to-erasure workflow; data processing agreements with all third parties; cookie consent banner; Privacy Policy and Terms of Service published before launch. The platform must register with the ICO and pay the annual data protection fee (**Tier 1: £52/year, or £47 by direct debit**, for organisations up to 10 staff / £632k turnover — verified July 2026). From 19 June 2026 a formal data-protection complaints process (acknowledgement within 30 days) is a statutory requirement.

### 6.2 KYC / AML (UK)

UK AML regulations mandate identity verification before any capital movement. Every investor must pass KYC before committing funds: passport verification + liveness, plus Companies House CRN check for business investors. KYC records are retained for 5 years. The Companies House API is free; per-check KYC costs are in Section 7.

### 6.3 FCA (syndication) — the critical legal gate

Equity-share syndication is a regulated activity: pooling investor money into property projects will very likely constitute operating a Collective Investment Scheme and/or investment-based crowdfunding, which requires FCA authorisation or a valid exemption. FCA application fees sit in **10 pricing categories from £280 up to £222,940** depending on permissions (verified July 2026); investment-platform permissions typically fall in the mid categories, and legal structuring advice is required to determine the correct route.

**RECOMMENDATION** (unchanged from the original plan, and reflected in the sprint plan): launch syndication as **Expression-of-Interest only** — investors pledge amounts and see equity previews, but no money moves on-platform — until FCA counsel signs off. Engage FCA legal counsel in parallel with Sprint 4. Budget: one-off structuring advice ~£5,000–£20,000 plus a retainer of ~£500–£1,500/month while the application is live.

### 6.4 RICS (valuations) and property law

All AI valuation outputs must display the RICS disclaimer (statistical projections, not a substitute for RICS-qualified surveys). Distressed listings must comply with the **Consumer Protection from Unfair Trading Regulations 2008** — all material information (defects, legal issues, probate status) must be disclosed — and **EPC display is legally required** for every listed property in the UK.

---

## 7. Full A-to-Z Cost Analysis (researched July 2026)

Every price below was researched and verified against vendor pricing pages and current market guides in **July 2026**. Prices are converted at £1 = US$1.25 and £1 = ₹125 (indicative mid-market rates, consistent with the earlier plan; live rates will vary). Three cost profiles are shown: **(A)** the 3-month build phase, **(B)** launch one-offs, and **(C)** recurring production costs from go-live.

### 7.1 Key pricing changes discovered vs the earlier plan

| Item | What changed / what the research found |
|---|---|
| **Google Maps Platform** | In March 2025 Google removed the $200/month credit, replaced it with per-SKU free monthly caps (typically 10,000 free events per Essentials SKU), and marked the Distance Matrix API as **LEGACY** — it can no longer be enabled on new projects. The commute engine must be built on the Routes API (Compute Route Matrix, ~$5 per 1,000 elements, billed per origin×destination element). Aggressive caching is essential. |
| **Onfido → Sumsub** | Onfido (now Entrust) is enterprise/sales-led with annual contracts commonly reported at $50k–200k. Sumsub is self-serve: plans from ~$149/month, per-check ~$1.35–1.85, AML screening ~$0.57/check, sandbox access same-day. **Decision: Sumsub.** |
| **Anthropic API** | Current rates: Claude Sonnet 4.6 = $3 input / $15 output per million tokens; Claude Haiku 4.5 = $1 / $5. (Claude Sonnet 5 launched June 2026 at an introductory $2/$10 until 31 Aug 2026, then $3/$15, with a new tokenizer that yields ~1.0–1.35× more tokens.) Prompt caching cuts cached input by 90%; batch processing halves costs. Original £50–150/month estimate remains realistic with caching and Haiku routing. |
| **Stripe UK** | Confirmed: 1.5% + 20p domestic cards, 2.5% + 20p EEA, 3.25% + 20p international; Stripe Billing adds 0.7% on subscription volume; disputes £15–20; Bacs Direct Debit 1% capped at £2 (useful for agent subscriptions). Fees are revenue-variable, not fixed. |
| **Search engine** | Elastic Cloud starts around £70–80/month — unnecessary at MVP volume. Postgres full-text + PostGIS is £0 extra on Supabase; Meilisearch Cloud (~£25/month) is the mid-step. Deferring Elasticsearch saves ~£75/month in year one. |
| **Separate backend host** | Consolidating on Next.js API routes removes the Railway/Render line (~£20/month) from the original plan. |
| **ICO fee** | Confirmed current: Tier 1 £52/year (£47 by direct debit). Fees rose ~30% after the government review, so slightly higher than the older £40 figure. |
| **Penetration test** | Current UK market for a medium-complexity web app handling payments and KYC: ~£4,000–£12,000 (CREST-certified firms at the upper end; quotes far below ~£3,000 are usually automated scans, not real tests). |

### 7.2 Cost profile A — the 3-month build phase (dev/tooling only)

During development almost everything runs on free tiers: Supabase Free → Pro late in the build, Vercel Hobby → Pro when the team needs previews, Sumsub sandbox, Stripe test mode, Pusher Sandbox, Resend free tier, Sentry Developer tier. Claude Code itself is assumed to be covered by your existing Anthropic plan and is not counted here.

| Service | Plan in build | Month 1 (£) | Month 2 (£) | Month 3 (£) |
|---|---|---|---|---|
| Vercel | Hobby → Pro | 0 | 16 | 16 |
| Supabase (Postgres+PostGIS) | Free → Pro | 0 | 0–20 | 20 |
| AWS S3 + CloudFront | Pay-as-you-go | 2–5 | 5–10 | 5–15 |
| Upstash Redis | Free / PAYG | 0 | 0–5 | 0–10 |
| Google Maps Platform | Per-SKU free caps + usage | 0 | 10–40 | 20–60 |
| Anthropic API (dev usage) | Pay-as-you-go | 0 | 10–30 | 20–60 |
| Sumsub | Sandbox | 0 | 0 | 0 |
| Stripe | Test mode | 0 | 0 | 0 |
| Pusher / Resend / Sentry | Free tiers | 0 | 0 | 0 |
| Domains (.co.uk + .com) | Annual, one-off | 25 | — | — |
| **TOTAL (build)** | | **≈ £27–30** | **≈ £41–121** | **≈ £81–181** |

> **Three-month build total: roughly £150–£330 (₹18,750–₹41,250)** in third-party costs — the build phase is cheap; the money is in launch one-offs and production.

### 7.3 Cost profile B — launch one-offs and annual items

| Item | Frequency | Cost (£) | Cost (₹) |
|---|---|---|---|
| Security penetration test (pre-launch, CREST) | One-off | 4,000–12,000 | 500,000–1,500,000 |
| ICO data protection fee (Tier 1) | Annual | 52 (47 by DD) | ≈6,500 |
| Domain registration (.co.uk + .com) | Annual | ≈25 | ≈3,125 |
| Sumsub onboarding/setup | One-off | 0–250 | 0–31,250 |
| FCA legal structuring advice (before real pooling) | One-off | 5,000–20,000 | 625,000–2,500,000 |
| FCA application fee (if/when authorised; 10 categories) | One-off | 280–12,500+ | 35,000–1,562,500+ |
| Google Workspace (2 seats, support@/admin@) | Monthly ≈ annual | ≈120/yr | ≈15,000/yr |
| Apple Developer + Google Play (future mobile phase) | Annual + one-off | 80 + 20 | 10,000 + 2,500 |

### 7.4 Cost profile C — recurring production costs from go-live

Assumes early-traction volumes: low thousands of monthly visitors, ~50–150 KYC checks/month, moderate AI usage with caching, ~10–50 paying agents. Ranges widen with traffic.

**Infrastructure & hosting**

| Service | Plan | Low £/mo | High £/mo | ₹/mo |
|---|---|---|---|---|
| Vercel Pro | $20/seat + usage credit | 16 | 45 | 2,000–5,625 |
| Supabase Pro | $25 + compute credit | 20 | 50 | 2,500–6,250 |
| AWS S3 + CloudFront | Pay-as-you-go | 10 | 35 | 1,250–4,375 |
| Upstash Redis | Pay-as-you-go | 0 | 10 | 0–1,250 |
| Sentry Team | $26/mo (annual) | 21 | 21 | ≈2,625 |
| Domains + SSL | SSL free (Let's Encrypt/Vercel) | 2 | 2 | ≈250 |
| **Subtotal** | | **≈69** | **≈163** | **8,625–20,375** |

**AI & data APIs**

| Service | Plan / rate | Low £/mo | High £/mo | ₹/mo |
|---|---|---|---|---|
| Anthropic API | Sonnet 4.6 $3/$15 · Haiku 4.5 $1/$5 per MTok; caching −90% | 40 | 160 | 5,000–20,000 |
| Google Maps Platform | SKU-based; Route Matrix ≈$5/1k elements; map loads ≈$7/1k after free caps | 30 | 100 | 3,750–12,500 |
| Land Registry (Price Paid / HPI) | Free open data | 0 | 0 | 0 |
| EPC Register API | Free (gov API) | 0 | 0 | 0 |
| Planning data feeds | Free (planning.data.gov.uk / councils) | 0 | 0 | 0 |
| Companies House API | Free (gov API) | 0 | 0 | 0 |
| Premium AVM (Hometrack etc.) — deferred to v2 | Commercial licence | (0) | (200–400) | (deferred) |
| **Subtotal (launch scope)** | | **≈70** | **≈260** | **8,750–32,500** |

**Compliance & payments**

| Service | Plan / rate | Low £/mo | High £/mo | ₹/mo |
|---|---|---|---|---|
| Sumsub KYC/AML | From ≈$149/mo; ≈$1.35–1.85/check + AML ≈$0.57 | 120 | 300 | 15,000–37,500 |
| Companies House CRN | Free | 0 | 0 | 0 |
| Stripe | 1.5% + 20p UK cards; Billing +0.7% — revenue-variable | 30 | 150 | 3,750–18,750 |
| ICO fee (monthly equivalent) | £52/yr Tier 1 | 4 | 4 | ≈500 |
| FCA legal counsel (retainer, until cleared) | Retainer | 500 | 1,500 | 62,500–187,500 |
| **Subtotal (incl. legal)** | | **≈654** | **≈1,954** | **81,750–244,250** |
| **Subtotal (excl. legal retainer)** | | **≈154** | **≈454** | **19,250–56,750** |

**Communication & notifications**

| Service | Plan | Low £/mo | High £/mo | ₹/mo |
|---|---|---|---|---|
| Resend | Pro $20/mo (50k emails) | 16 | 16 | ≈2,000 |
| Pusher Channels | Startup $49/mo (500 conns, 30M msgs) | 39 | 39 | ≈4,875 |
| Twilio SMS (optional) | Pay-as-you-go | 0 | 20 | 0–2,500 |
| Google Workspace | Business Starter × 2 seats | 10 | 14 | 1,250–1,750 |
| **Subtotal** | | **≈65** | **≈89** | **8,125–11,125** |

**Total recurring monthly summary**

| Scenario | Monthly (£) | Monthly (₹) | Notes |
|---|---|---|---|
| Build phase (avg of Months 1–3) | ≈50–110 | ≈6,250–13,750 | Free tiers + dev usage |
| Launch, EOI mode, excl. FCA retainer | ≈360–970 | ≈45,000–121,250 | The realistic day-one run rate |
| Launch, with FCA retainer | ≈860–2,470 | ≈107,500–308,750 | While authorisation is pursued |
| Post-FCA steady state (retainer drops) | ≈700–1,500 | ≈87,500–187,500 | Matches the original plan's estimate |

> **Variable-cost warning:** four lines scale with success rather than time — Stripe (percentage of revenue), Sumsub (per investor signup), Anthropic (per AI interaction) and Google Maps (per search/commute query). The sprint plan bakes in the mitigations: Redis caching of commute results and AI responses, Haiku routing for high-volume AI tasks, prompt caching, map session budgets and per-service spend alerts.

---

## 8. Risk Register (updated)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| FCA compliance delays syndication launch | High | High | Launch syndication as Expression-of-Interest only (no money movement). Engage FCA counsel in parallel with Sprint 4. |
| KYC provider onboarding takes longer than expected | Medium | High | Start the Sumsub application in Week 1; integrate against sandbox; mock KYC in staging until live keys arrive. |
| Google Maps cost overrun (Routes API bills per element) | Medium | Medium | Cache commute matrices in Redis, restrict element counts per query, set daily quotas and billing alerts. |
| Anthropic API costs spike with heavy AI usage | Medium | Low | Prompt caching, Haiku 4.5 routing for enhancement/tagging, response caching, monthly spend cap. |
| Postgres search outgrown by listing volume | Low | Medium | Search service is interface-abstracted; swap to Meilisearch (~£25/mo) or Elastic (~£75+/mo) without touching callers. |
| Senior dev availability constraint | Medium | High | The sprint plan documents every architectural decision so Claude Code and any collaborators can proceed independently. |
| Launch date slips | Low | Medium | Sprint 6 contains buffer; scope explicitly marked cut-first: ad slots API and planning probability tool. |

### Pre-launch checklist (condensed)

**Technical:** all endpoints tested with real data · KYC live and verified · Stripe end-to-end · GDPR audit · penetration test complete · automated daily DB backups · Sentry configured · page loads < 2s · mobile responsive verified.

**Legal:** Privacy Policy + ToS published · FCA position reviewed · ICO registration paid · EPC display verified on all listings.

**Business:** ≥10 agents onboarded with live listings · ≥5 KYC-verified investors · support inbox live · launch marketing ready.

**Agreements:** Sumsub contract · Stripe verified · Land Registry/EPC data usage confirmed · Google Maps billing capped · Anthropic production limits confirmed.

---

*PropLink UK — Discovery · Due Diligence · Syndication · Refurbishment · Completion*

*Companion document: `PropLink_Sprint_Plan_Claude_Code.md` — the 12-week, week-by-week build brief with per-task acceptance criteria and human-task instructions.*
