# Sprint Status — Live Tracker

> Living document. Update task states as work happens; update the phase line in
> `docs/CONTEXT.md` at sprint boundaries. Task definitions and acceptance criteria:
> `docs/PropLink_Sprint_Plan_Claude_Code.md`. Per-sprint detail: `SPRINT-NN.md`.
> Sprint-level progress sheet (status/remarks/comments): `SPRINT-TRACKER.md`.

**We are here → Sprint 3 (Search, Map & Commute). Tasks 3.1 and 3.2 done, the
Week 5 checkpoint passed 2026-08-07.** Sprint 2 completed and DoD-passed the
same day — full criteria table in `SPRINT-02.md`. Suite now at **466 unit +
integration tests and 43 Playwright tests green**; Lighthouse on `/marketplace`
at SEO 100 / accessibility 100 / best practices 100. ⚠️ **Week 6 is blocked:**
Tasks 3.3 and 3.4 need H3.1 (Google Maps browser key + Places/Routes APIs +
quotas), the only provider in this build the plan says is required even locally
— Google Maps JS will not render without a real key. Task 3.5 (saved searches &
alerts) is not blocked and can be brought forward.

Landing page `/` redesigned 2026-08-25 (unplanned, requested directly). Two
passes: the global metrics strip moved into the hero with zero-valued metrics
omitted (**ADR-005**) and duplicate auth CTAs removed; then an editorial/luxury
restyle to a supplied reference, which added Playfair Display as a
marketing-only display face (**ADR-006**) plus a working hero search bar,
live distress-category tiles and an editorial listing card. Palette unchanged.
Detail in `SPRINT-03.md`.

Sprint 1 fully verified locally (23 unit + 12 E2E tests green). Sprint 2 final
state: typecheck/lint/format clean, production build green, 10 consecutive clean
Playwright runs, Lighthouse on a seeded `/marketplace/[id]` at **SEO 100 /
accessibility 100 / best practices 100**, and a 40-listing demo catalogue
seeded across 12 UK cities. The Supabase
pooler blocker that left Tasks 2.1–2.4 code-complete-but-unverified is worked
around with a local PostGIS database (`BLOCKERS.md`); running the suite against
it retro-verified all four and turned up a 500-on-null-coordinates bug, two WCAG
contrast failures and three E2E harness races (see `SPRINT-02.md` § Task 2.5).
Supabase itself still needs `npm run db:migrate` once H1.2 is restored: all
three Sprint 2 migrations are applied locally only. Vercel/CI deployment
criteria deferred per ADR-004.

Legend: ✅ done · 🟡 code-complete, verification blocked (see BLOCKERS.md) ·
🔵 in progress · ⬜ not started · ⏭ deferred

## Sprint 1 (Weeks 1–2) — Foundation

| Task                       | Scope                                                                                                               | State                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1.1 Project setup          | Next.js 16 + TS strict + Tailwind tokens, ESLint/Prettier, repo structure, `.env.example`, CI workflow, Sentry init | ✅ (CI runs on first push — H1.1)                                   |
| 1.2 Database & Prisma      | Full schema, PostGIS/pg_trgm migration, FTS trigger, seed (4 users + 3 agent profiles)                              | ✅ verified 2026-07-23: migrate+seed clean, `ST_DWithin` + FTS pass |
| 1.3 Auth & RBAC pt 1       | Credentials + Google, registration w/ role select, JWT with `role`+`kycStatus`, login/logout                        | ✅ verified 2026-07-23: register+login live; Google deferred (H1.6) |
| 1.4 Auth & RBAC pt 2       | Email verify, password reset, route middleware, `requireRole()`/`requireKyc()`, GDPR endpoints                      | ✅ verified 2026-07-23 (E2E: verify→login ×3 roles, 403, erasure)   |
| 1.5 Layout & metrics strip | Global nav, KYC pill, metrics strip (Redis-cached), UI primitives, `/dev/ui`                                        | ✅ verified 2026-07-23 (`/dev/ui` + live strip E2E)                 |
| 1.6 Admin shell            | `/admin` users table, placeholder tabs, AuditLog on mutations                                                       | ✅ verified 2026-07-23 (deactivate + audit row E2E)                 |

**Week 1 checkpoint: PASSED 2026-07-23** — repo ✅ (CI in-repo, runs when H1.1
revives) · schema migrated + seeded on Supabase ✅ · register/login verified ✅ ·
human tasks: H1.2 done; rest deferred per ADR-004.

**Week 2 checkpoint / Sprint 1 DoD: PASSED 2026-07-23** — 4 roles + RBAC
enforced (middleware + server-side) ✅ · design system + live metrics strip ✅ ·
admin shell + audit ✅ · GDPR (banner, placeholders, erasure) ✅ · Vercel/CI
deploy criteria ⏭ deferred (ADR-004). Detail: `SPRINT-01.md`.

## Sprint 2 (Weeks 3–4) — Agent Portal & Listing Engine

✅ 2.1 S3 uploads · ✅ 2.2 Multi-step listing form · ✅ 2.3 Moderation queue ·
✅ 2.4 Agent profile hub · ✅ 2.5 Property detail v1 · ✅ 2.6 Leads & analytics ·
✅ 2.7 Seed 40 listings

**Sprint 2 DoD: PASSED 2026-08-07** — full criteria table in `SPRINT-02.md`.
Carried into Sprint 3: Supabase migrations still unapplied (H1.2), the real
S3/Maps/Resend providers unexercised by tests (by design), `TODO(H1.5)` rate
limits on four public POSTs, and the missing `<main>` landmark on the
authenticated portal pages.

2.1–2.4 moved 🟡 → ✅ on 2026-08-07: their Playwright specs were written when no
database was reachable and had never been run. They now pass against the local
PostGIS instance (10 consecutive clean suite runs).

2.2 code-complete: `GeocodingService` (mock, real-provider-ready), `ListingService`
(status machine, listing-limit gate, draft/update/submit), 3 thin Zod-validated
routes, 5-step wizard at `/agent/listings/**`. 73 new unit tests green (status
machine, limit, geocode cache, Zod edge cases, service + route handlers).
Verification blocked on Supabase connectivity in this sandbox — see
`SPRINT-02.md` for the commands to run once DB access works.

2.3 code-complete: `ModerationService` (`src/services/listings/moderationService.ts`)
— approve (LIVE + `publishedAt`, re-asserts the free-tier listing limit, clears
any stale rejection reason, AuditLog, agent email) and reject (PENDING_REVIEW
→ DRAFT — a new admin-only edge added to the status machine — persists
`rejectionReason`, AuditLog, agent email with the reason). Two additive
columns (`Property.rejectionReason`, `Property.submittedAt`). Real
`/admin/moderation` page (table + full-preview "Review" modal, Approve/Reject)
replaces the Sprint 1 placeholder. 36 new unit tests green (status machine,
`transitionStatus` extension, service, both routes). Playwright spec written
(`tests/e2e/admin-moderation.spec.ts`); DB-backed verification blocked the same
way as 2.1/2.2 — see `SPRINT-02.md`.

2.4 code-complete: `AgentProfileService` (`src/services/agents/`) — public
`/agents/[id]` aggregates (star rating from `Appraisal.rating`, Verified
Completed Deals from SOLD listings, both computed live), case-study CRUD
(owner-agent only), and the appraisal qualification rule (INVESTOR/BUYER role,
prior Enquiry/Deal on the agent's listings, one review per user per profile —
all server-enforced, not just Zod). Multi-profile switcher in the agent nav
(httpOnly cookie, server-verified on every write) now feeds the listing
wizard's default profile. No migration needed — the schema already had every
field this task used. 70 new unit tests green (aggregates, ownership,
qualification rule, both new route files, the switcher's server action).
Playwright spec (`tests/e2e/agent-profile-hub.spec.ts`) now passing against the
local PostGIS database.

2.5 done: `StaticMapService` (`src/services/maps/`, mock renders an inline-SVG
`data:` URI so the map works offline; Google Static Maps impl ready for
`GOOGLE_MAPS_API_KEY`), `EnquiryService` (`src/services/enquiries/`),
`ListingService` visibility gate (`getListingForPublicView` —
LIVE/UNDER_OFFER/SOLD public, owner-agent/admin preview, everyone else 404) and
`getListingCoordinates`, `POST /api/enquiries`, and the SSR `/marketplace/[id]`
page (gallery, distress chips, EPC badge, price, ROI, static map + satellite
toggle, agent card, enquiry form, comparables/price-history placeholders,
OpenGraph + canonical). 42 new unit tests; 5 new Playwright tests; Lighthouse
SEO 100 (brief requires ≥ 90). No migration needed. Full detail, including the
three defects and three harness races the verification run exposed:
`SPRINT-02.md` § Task 2.5.

2.6 done: `Property.viewCount` (one additive column — saves are counted live
from `SavedProperty` instead), `analytics.ts` (session-cookie view dedupe;
owner-agent and admin views excluded, other agents' counted),
`savedProperties.ts` (idempotent save/unsave, BUYER/INVESTOR only),
`EnquiryService.listEnquiriesForAgentProfile`/`updateEnquiryStatus`, routes
`PATCH /api/enquiries/[id]` + `POST /api/listings/[id]/view` (public, no role
gate) + `POST`/`DELETE /api/listings/[id]/save`, and the real `/agent/leads`
(analytics strip + status-managed leads table) plus Views/Saves columns on
`/agent/listings`. 57 new unit tests; 6 new Playwright tests. Also closed the
`intel` badge-contrast blocker Task 2.5 had raised (13.5:1 via `text-primary`
ink, no brand-token change).

2.7 done: `prisma/seedListings.ts` (the catalogue as pure, deterministic data)
plus a restructured `prisma/seed.ts` — 40 listings across 12 UK cities
(30 LIVE / 5 PENDING_REVIEW / 3 UNDER_OFFER / 2 SOLD), 180 local SVG placeholder
images, all 8 distress tags and all 7 EPC bands, £45k–£450k in integer pence,
PostGIS + FTS populated on 40/40, 3 case studies (one an honest loss), 5
appraisals each backed by a qualifying enquiry, 9 enquiries and 12 saves. The
seeded agent gets an ELITE `Subscription` — otherwise the free tier's 3-LIVE cap
would make the demo catalogue unapprovable. Idempotent: re-running produces
identical counts.

## Sprint 3 (Weeks 5–6) — Search, Map & Commute

✅ 3.1 SearchService · ✅ 3.2 Search UI · ⬜ 3.3 Map & density grid (H3.1) ·
⬜ 3.4 Commute engine (H3.1) · ⬜ 3.5 Saved searches & alerts

**🏁 Week 5 checkpoint: PASSED 2026-08-07** — every filter combination returns
correct results through a search page with live counts and shareable URLs.
Filter correctness is asserted twice: against generated SQL in unit tests, and
against real rows in `tests/integration/search-service.test.ts`.

3.1 done: `SearchService` interface + `PostgresSearchService`
(`src/services/search/`) — a **pure** query builder (params → parameterised
`Prisma.Sql`, so every filter is unit-testable with no DB), FTS with a pg_trgm
trigram fallback, PostGIS bbox and centre+radius, ANY-match distress tags,
four sorts each with a stable tiebreaker, clamped pagination, and
`parseSearchParams` (URL → params; malformed input degrades to a broader search
rather than a 400, and money travels the URL in pounds). Routes
`GET /api/search` and `GET /api/search/count`. Search excludes SOLD; UNDER_OFFER
stays in. 93 new tests, including a new `tests/integration/**` category that
runs against the real seeded database — that's where the sprint plan's
"p95 < 150ms + EXPLAIN ANALYZE" criterion is actually asserted. No migration
needed: Sprint 1 already shipped the GIST/GIN indexes and the FTS trigger.

3.2 done: `/marketplace` — SSR search page whose entire state lives in the URL
(`buildSearchQueryString` is the tested round-trip inverse of
`parseSearchParams`), a debounced filter sidebar (budget slider, EPC multi,
distress chips, type, beds, min ROI, sort, clear), a live count from
`/api/search/count` guarded against stale responses, a `PropertyCard` grid and
`<Link>`-based pagination. 16 new unit tests, 13 new Playwright tests;
Lighthouse 100/100/100. Note for future client components: import
`services/search/queryString` directly, never the `@/services/search` barrel —
it pulls Prisma into the client bundle.

**Landing-page redesign, second pass (2026-09-03)** — not a numbered task; a
product-owner-driven restyle of `/` to a second motion reference. Full-bleed
photographic hero with the header floating over it, a marketing-only
mist/ink/ember palette (ADR-007), and a scroll-driven 3D orbit that swings the
hero image through three viewing angles (ADR-008) — hand-rolled, no motion
library, reduced motion attaches no listener at all. `<HeroStage>` is the only
client component on the page. The hero photograph (H3.3) was raised with a
placeholder and delivered the same day — `src/assets/heroimage.jpeg`, imported
through `next/image`; the brief it was generated from is kept at
`docs/marketing/hero-image-prompt.md` for re-rolls. Swapping the placeholder for
real brick broke the headline's contrast (2.56:1); fixed with a fixed two-column
hero grid and an explicit-stop `TYPE_SCRIM`, re-measured to 11.5:1 / 6.9:1.
16 new unit tests, 2 new Playwright.

**Palette retune (2026-09-03)** — also product-owner-driven, and platform-wide:
navy + electric blue out, ink `#1B1F1E` + terracotta `#B4573C` in, retuned in
`globals.css` alone since everything goes through tokens (ADR-009). The
marketing-only `mist`/`ink`/`ember` tokens were deleted as duplicates. `SiteHeader`
became a flush hairline bar — wordmark left, small-caps links centred, ink pill
right. Two knock-ons fixed: `Button`'s `primary` moved off `accent` (terracotta
next to `danger` is a hazard), and the header over the hero failed AA at 3.29:1
until it gained a haze and stronger links (now 11.89:1). All token pairs measured
old-vs-new; all pass.

**Hero, fourth pass (2026-09-03)** — the hero read as ordinary, so it now opens
from a gallery-print `clip-path` aperture to full bleed as you scroll, with the
headline's lines rising from masks and a hairline index ticker along the foot
(ADR-010). Aperture geometry is a TDD'd pure function beside the orbit; it is
skipped below `sm`, where a tall print is a sliver. Contrast re-measured across
the whole travel, all passing. ADR-008's claim that Safari lacks
`animation-timeline: scroll()` was corrected — it is now supported, and held
back only by Baseline.

**Hero, fifth pass (2026-09-04)** — the product owner supplied the reference
image itself, so the hero is now laid out to it and the fourth pass's aperture,
ticker and plate label are gone (ADR-011 supersedes ADR-010). Proof cluster left,
oversized roman headline right of centre, dark pill CTA, dark glass search card
bottom-left, closing note bottom-right, photograph behind all of it. `TYPE_SCRIM`
retuned from both ends and every element re-measured; all pass. Three honest
departures from the reference are recorded in ADR-011 — no fabricated client
avatars, a plate under the proof cluster, and all four search fields kept.

**Hero stripped back (2026-09-04)** — the product owner then removed four of the
five hero elements, leaving the headline and one `Create an account` pill
(ADR-011 § Amendment). `<HeroFigure>` and `<HeroSearchBar>` deleted; the search
bar's e2e test went with it, which was the only end-to-end proof that a form
drives the marketplace's URL contract — restore both together if a search entry
point returns. Nothing above the fold now routes anywhere but `/register`.

**Landing rebuilt (2026-09-04)** — a new reference (a third-party Webflow rebuild
of Mollie's Plink; structure and language only, not its assets) replaced the
photographic hero with a six-block flat-colour layout: a `brand` petrol band with
a floating object, near-black middle sections, a light platform section with a
scrolling ecosystem band, and a closing CTA back on `brand` (ADR-014, superseding
ADR-011). New `--color-brand #0E4A55`, band-ground only. The terrace photograph
moved to the categories split, which deleted `TYPE_SCRIM` and the fog scrims.
Contrast now swept across all 73 text nodes rather than sampled — 0 failures.
Four soft-3D renders are outstanding (H3.4); geometric SVG stand-ins with the
same silhouettes ship meanwhile.

**Marketplace masthead (2026-09-04)** — `/marketplace` took the reference's shell
at tool scale: a `primary` masthead with the header floating on it (it joined
`OVERLAY_ROUTES`), and the sidebar and grid below deliberately unchanged
(ADR-015). The page-wide sweep caught a pre-existing failure on an element UK law
requires — EPC bands B and F were white at 2.72:1 and 2.70:1 and moved to ink.
`/`, `/marketplace` and `/marketplace/[id]` all sweep clean.

**Role portals (2026-09-04)** — three separate dashboards on one shell: `/agent`
(gained a front door), `/investor` and `/buy` (both new), read-side only over the
data Sprint 1 already modelled (ADR-016). Registration and login now redirect
through `/portal`, a server-side role router, instead of landing on `/`.
Separation enforced four times over — middleware, per-page `auth()`, `where`-scoped
queries, and a header offering only the caller's own portal. 7 new Playwright
tests assert each role gets a 403 on both other portals. Investor write flows
(pledging) remain Sprint 4 and gated on KYC + `SYNDICATE_PAYMENTS_ENABLED`.

**Buyer portal built out (2026-09-07)** — `/buy` is now a marketplace, not a
dashboard: search home with collapsed distress filters, an affordability
calculator feeding `maxPrice`, and **real write flows** for viewing requests,
offers and buyer↔agent messaging, plus a deal tracker and price history
(ADR-017). None of those is regulated — EOI and KYC gate syndicate pledges only.
Two gaps flagged in the UI itself: chat persists but does not push (H4.2 Pusher),
and the price chart runs on **seeded SAMPLE data**, not Land Registry (H5.4).

**Buyer portal redesigned as a consumer surface (2026-09-18, unplanned, requested
directly)** — `/buy` was a B2B tool in consumer clothing: a black portal band
over a five-field affordability form, with no property visible until you
scrolled past it, `/marketplace`'s defect-first filter rail, and a card ending
in "Commute times coming in a later week". Rebuilt to the Rightmove/Zoopla
reference (ADR-020): `<BuyerShell>` light chrome with counted tabs, a sticky
popover filter bar, **results on arrival** with the affordability calculator
moved inside `Price ▾`, carousel-and-heart cards with a grid/list toggle in the
URL, a shortlist that renders as cards, and a two-column detail page with a
sticky action card (fixed bottom bar on mobile). Filter behaviour extracted to
`useSearchQuerySync`, shared with `/marketplace`'s rail, which is otherwise
unchanged. A second pass cut the chrome above the first property from ~300px to
~185px — the tinted title band flattened, sort and the layout toggle folded onto
the filter row, the results toolbar reduced to a line of text. `SearchResultItem` gained `imageUrls` (read-side only, no migration).
⚠️ **No map view** — the reference has one, but H2.2's browser key is still
missing and a pinned mock SVG behind a "Map" toggle would be worse than none;
row added to `BLOCKERS.md`.

**Figtree everywhere (2026-09-04)** — one variable family replaced both Inter and
Playfair Display; `--font-sans` and `--font-display` now resolve to it (ADR-012
supersedes ADR-006). The roman/italic heading device became a semibold/light
weight contrast, for the same reason ADR-006 rejected a sans italic in the first
place. Every `font-display` heading gained `font-semibold`, and the hero
headline re-tracked for a geometric sans. Contrast re-measured, unchanged.

⚠️ **3.3 and 3.4 are blocked on H3.1** (Google Maps browser key + Places/Routes
APIs + quotas). Unlike every other provider in this build, the plan flags this
one as needed **even locally** — Google Maps JS will not render a map without a
real key. `GOOGLE_MAPS_API_KEY` is already wired: `StaticMapService` switches
from mock to real the moment it is set.

## Sprint 4 (Weeks 7–8) — Investor Portal, KYC & Syndicates (EOI)

⬜ 4.1 KycService (Sumsub + mock) · ⬜ 4.2 Syndicate pledge flow ·
⬜ 4.3 Refurb console · ⬜ 4.4 Investor dashboard · ⬜ 4.5 Lifecycle to completion

## Sprint 5 (Weeks 9–10) — AI, Stripe & Buyer Portal

⬜ 5.1 AiService foundations · ⬜ 5.2 AI Advisor · ⬜ 5.3 AVM ·
⬜ 5.4 Listing Enhancer · ⬜ 5.5 Planning tool · ⬜ 5.6 Stripe billing ·
⬜ 5.7 Buyer portal & deal flow

## Sprint 6 (Weeks 11–12) — Intelligence, Hardening & Launch

⬜ 6.1 Market intelligence · ⬜ 6.2 Planning feed · ⬜ 6.3 Ecosystem & ads ·
⬜ 6.4 Performance · ⬜ 6.5 Security & GDPR closeout · ⬜ 6.6 QA & UAT · ⬜ 6.7 Launch

## Cut-first scope (if a week runs over)

Ad-slot billing → planning probability tool → PWA manifest. **Never** cut security,
KYC gating or GDPR tasks.
