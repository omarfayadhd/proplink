# PropLink UK — Product Context

> Living document. Update whenever product scope, constraints or phase change
> (see AGENTS.md § living-docs rule). Full detail: `PropLink_UK_Master_Document.md`.

## What we are building

A web-first platform for the UK **distressed property** market combining four things
that exist nowhere else in one place: a Distressed Asset Marketplace, an Investor
Syndication Engine, an Agent Portal with verified credibility, and a Market
Intelligence Toolkit.

**Core commercial loop:** agent lists property → investor finds & funds it (or buyer
purchases) → deal closes on-platform → platform logs a success fee.

## Roles

| Role       | Side       | Key actions                                                                                          |
| ---------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `AGENT`    | Supply     | List distressed properties, tag defects, manage leads, build verified profile                        |
| `INVESTOR` | Capital    | Pass KYC, pledge into syndicates, track refurbs and ledger                                           |
| `BUYER`    | Demand     | Search, calculate affordability, chat, book viewings, submit offers                                  |
| `ADMIN`    | Governance | Moderate listings, monitor KYC, manage fees/ads/users. **Seed-only — never self-serve registration** |

## Five portals

Marketplace · Investor Portal · Agent Portal · Market Intelligence · Ecosystem
Marketplace. The four global metrics — Total Distress Inventory · Completed
Syndicate Deals · Accrued Success Fees · Vetted Referrals Routed — are on the
landing page rather than a strip above the header (ADR-005).

**Not one shared nav bar.** The global header carries no navigation beyond the
wordmark and, signed in, a single link to the portal that role owns (ADR-009,
ADR-016). Each role portal navigates itself. The three self-serve roles —
`AGENT`, `INVESTOR`, `BUYER` — are strictly separate: `/agent`, `/investor` and
`/buy` each 403 for the other two.

## The 8 distress tags

SUBSIDENCE · DAMP · RENOVATION_NEEDED · PROBATE · ASBESTOS · ROOF_REQUIRED ·
WATER_DAMAGE · FIRE_DAMAGE

## ⚠️ Compliance constraints (never violate)

1. **FCA / EOI mode.** Equity syndication is a regulated activity. Until FCA counsel
   signs off, the syndicate engine records _pledges only_ — **no money moves**.
   Guarded by `SYNDICATE_PAYMENTS_ENABLED=false`. Stripe only for agent
   subscriptions, boosts, ads.
2. **KYC gate.** Investors must have `kycStatus = APPROVED` before any pledge —
   server-side enforcement. KYC records retained 5 years (soft-delete only; they
   survive GDPR erasure as anonymised records).
3. **GDPR.** Consent at registration (`gdprConsentAt`), cookie banner, privacy/terms
   pages, right-to-erasure endpoint, data export.
4. **RICS disclaimer** on every AI valuation/planning output.
5. **EPC rating** displayed on every listing (UK legal requirement); all material
   information (defects, probate status) disclosed.

## Deferred by design (do NOT build in the 12 weeks)

Native mobile apps · Elasticsearch · premium AVM data (Hometrack) · real capital
movement · multi-language.

## Current phase

**Sprint 2 (Weeks 3–4) — Agent Portal & Listing Engine: complete** (2026-08-07,
branch `sprint-2`). All seven tasks are done and verified against a real
database: S3-shaped uploads, the 5-step listing wizard, the admin moderation
queue, the agent profile & credibility hub, the public `/marketplace/[id]`
detail page with enquiries, agent leads & listing analytics, and a 40-listing
demo catalogue. **Sprint 3 (Weeks 5–6) — Search, Map & Commute — is next.**
See `sprints/STATUS.md` for the live tracker and `BLOCKERS.md` for what is
waiting on human tasks.

**Mode: LOCAL-ONLY development** (2026-07-23, ADR-004) — no GitHub/Vercel/domains/
AWS/launch tasks for now; each deferred item has a revive trigger in
`HUMAN_TASKS.md` § Deferred, checked at the start of every week.

## Glossary

- **EOI** — Expression of Interest: a recorded pledge with no money movement.
- **GDV** — Gross Development Value: estimated post-refurbishment sale value.
- **Distressed property** — stock sold below market due to defects, probate, or urgency.
- **Syndicate** — multiple investors pooling capital into one refurb project with proportional equity.
- **Success fee** — platform fee logged when a deal completes on-platform.
