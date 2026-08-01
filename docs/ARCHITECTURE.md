# PropLink UK — Architecture

> Living document. Any change to stack, schema, patterns or services MUST be
> reflected here in the same piece of work (AGENTS.md § living-docs rule).
> Decisions with trade-offs get an ADR in `docs/adr/`.

## Stack (as installed)

| Layer       | Choice                                                                                                                                                   | Notes                                                                                                                                                                                                                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework   | Next.js 16.2 (App Router) + TypeScript strict                                                                                                            | One repo, one deployable. Server Actions + Route Handlers — no separate API server. See ADR-003                                                                                                                                                                                                                |
| Styling     | Tailwind CSS v4 (`@theme` tokens in `src/app/globals.css`)                                                                                               | shadcn/ui permitted for primitives                                                                                                                                                                                                                                                                             |
| State       | Zustand (client) + TanStack Query (server state)                                                                                                         |                                                                                                                                                                                                                                                                                                                |
| ORM / DB    | **Prisma 7** → PostgreSQL + PostGIS on Supabase                                                                                                          | Driver-adapter architecture — see ADR-001. Pooled URL at runtime, direct URL for migrations. ⚠️ Supabase is used as **managed Postgres ONLY** — never install `@supabase/supabase-js`/`@supabase/ssr` or follow Supabase's client/auth/RLS quickstarts; Prisma is the only DB client and Auth.js the only auth |
| Search      | Postgres FTS (`tsvector` trigger) + `pg_trgm` + PostGIS                                                                                                  | Behind a `SearchService` interface; Elastic/Meilisearch can replace later. NO Elasticsearch in this build                                                                                                                                                                                                      |
| Cache/queue | Upstash Redis                                                                                                                                            | Commute-matrix cache, AI response cache, rate limiting                                                                                                                                                                                                                                                         |
| Auth        | Auth.js (NextAuth v5 beta) — credentials + Google                                                                                                        | JWT sessions carrying `role` + `kycStatus`                                                                                                                                                                                                                                                                     |
| Storage     | `StorageService` interface (`src/services/storage/`) — `MockStorageService` (local disk, active) / `S3StorageService` (real presigned POST + CloudFront) | Sprint 2 Task 2.1. Selected by `STORAGE_PROVIDER=mock\|s3`, default mock while H1.4/H2.1 are deferred — see `docs/BLOCKERS.md`                                                                                                                                                                                 |
| AI          | Anthropic API — Sonnet (Advisor/AVM/Planning), Haiku (Enhancer/tagging)                                                                                  | Arrives Sprint 5; Redis-cached, budget-capped                                                                                                                                                                                                                                                                  |
| Maps        | Google Maps JS API + Routes API `computeRouteMatrix`                                                                                                     | Distance Matrix API is Legacy — do not use                                                                                                                                                                                                                                                                     |
| KYC         | Sumsub (sandbox) behind `KycService` + mock                                                                                                              | Arrives Sprint 4                                                                                                                                                                                                                                                                                               |
| Payments    | Stripe (test mode) — subscriptions/boosts/ads ONLY                                                                                                       | Syndicate charges forbidden while `SYNDICATE_PAYMENTS_ENABLED=false`                                                                                                                                                                                                                                           |
| Realtime    | Pusher Channels                                                                                                                                          | Arrives Sprint 4                                                                                                                                                                                                                                                                                               |
| Email       | `Mailer` interface — Resend (auto when `RESEND_API_KEY` set) + console fallback                                                                          | `src/services/email/mailer.ts`; verification + reset emails live, console-logged in dev                                                                                                                                                                                                                        |
| Hosting/CI  | Vercel + GitHub Actions (`.github/workflows/ci.yml`)                                                                                                     | typecheck, lint, format, unit, E2E on PR                                                                                                                                                                                                                                                                       |
| Monitoring  | Sentry via `instrumentation.ts` / `instrumentation-client.ts`                                                                                            | No-op until `SENTRY_DSN` set                                                                                                                                                                                                                                                                                   |
| Testing     | Vitest (`tests/unit`) + Playwright (`tests/e2e`, prod build on port 3100 in CI)                                                                          |                                                                                                                                                                                                                                                                                                                |

## Repo structure

```
/src
  /app                 # App Router: (auth)/login+register, api/, portals arrive per sprint
  /components          # ui/ primitives, then listings/, syndicates/, agents/, charts/, layout/
  /lib                 # db.ts (Prisma), auth.ts (NextAuth) — later: redis, s3, stripe, pusher, resend
  /services            # ALL business logic (users/, later: search/, kyc/, maps/, ai/, marketdata/, fees/)
  /generated/prisma    # generated client (gitignored; `npm run db:generate` / postinstall)
  /types               # ambient types (next-auth session augmentation)
  /jobs                # data ingestion scripts (Sprint 5+)
/prisma                # schema.prisma, migrations/ (raw SQL for PostGIS/FTS), seed.ts
/tests                 # unit/ + e2e/
/docs                  # living docs (see AGENTS.md)
prisma.config.ts       # Prisma 7 CLI config: datasource URL, migrations path, seed cmd
```

## Data model — key conventions

Full schema: `prisma/schema.prisma` (implements the sprint plan's core schema).

- **Money = integer pence** in every `*GBP` field. Never floats.
- `Property.location` is `geography(Point,4326)` (PostGIS `Unsupported` type) —
  set/queried via `$queryRaw`; GIST-indexed.
- `Property.searchVector` is `tsvector`, maintained by a DB trigger
  (title weight A, city/region/postcode B, description C); GIN-indexed, plus
  trigram indexes on title/city for fuzzy fallback.
- Extensions (`postgis`, `pg_trgm`), indexes and the trigger live in the raw SQL of
  `prisma/migrations/20260709000000_init/migration.sql` — Prisma can't model them.
- `KycRecord` is retained 5 years (UK AML): soft-delete only; GDPR erasure
  anonymises the user but keeps the record.
- `VerificationToken` (email verify / password reset) is app-managed, consumed in
  Week 2.
- Listing statuses: DRAFT → PENDING_REVIEW → LIVE → UNDER_OFFER → SOLD (only admin
  approves to LIVE). Syndicates: OPEN → FUNDED → IN_REFURB → LISTED → COMPLETED.

## Auth architecture

- `src/lib/auth.ts` — NextAuth v5: Credentials (bcrypt) always; Google provider
  registered only when H1.6 credentials exist.
- **JWT strategy**; token carries `uid`, `role`, `kycStatus` → exposed on
  `session.user` (typed in `src/types/next-auth.d.ts`). OAuth users get role/kyc
  loaded from DB in the `jwt` callback.
- Registration: `POST /api/register` (thin) → `src/services/users/registration.ts`
  (Zod schema + bcrypt + create). Self-serve roles: AGENT/INVESTOR/BUYER.
  **ADMIN is seed-only.** First Google sign-in provisions a BUYER.
- **Route gating** (`src/middleware.ts`): `/admin` (ADMIN), `/agent/**`
  (AGENT/ADMIN), `/investor/**` (INVESTOR/ADMIN) via edge-safe `getToken` on the
  JWT cookie — anonymous → login redirect, wrong role → 403 page. Middleware is
  UX-level only; every mutation ALSO checks `requireRole()` / `requireKyc()`
  (`src/lib/authz.ts`) server-side.
- **Single-use tokens** (`services/users/verificationTokens.ts`): sha256-hashed at
  rest, raw only in the emailed link; email verify 24 h TTL, password reset 1 h.
  A successful reset also marks the email verified.
- **GDPR**: cookie banner (localStorage consent), `/privacy` + `/terms`
  placeholders (final text = H6.3), `DELETE /api/me` anonymises in place and
  preserves `KycRecord` (AML 5-year retention).
- **Admin rule**: every admin mutation writes an `AuditLog` row via
  `services/admin/audit.ts` — no exceptions.
- **Metrics**: `services/metrics/globalMetrics.ts`, Redis `cached()` 60 s
  (`src/lib/redis.ts` — degrades to direct compute without Upstash keys).

## Uploads

- `StorageService` (`src/services/storage/`): presigned-upload interface with
  `MockStorageService` (writes to `public/uploads/dev/` via the dev-only
  `POST /api/uploads/dev` route) and `S3StorageService` (real presigned POST via
  `@aws-sdk/s3-presigned-post`, CloudFront URL from `CLOUDFRONT_URL`). Chosen by
  `STORAGE_PROVIDER=mock|s3`, defaulting to mock while AWS env vars are absent
  (`docs/BLOCKERS.md` H1.4/H2.1).
- `POST /api/uploads/presign` — auth required (AGENT/ADMIN via `requireRole()`),
  Zod-validated content-type allowlist + size caps (images ≤10MB, PDFs ≤20MB,
  `src/services/storage/validation.ts`) before a presign is issued.
- `<ImageUploader max={20}>` (`src/components/uploads/`) — drag-drop + picker,
  client previews, presign → direct upload, drag-reorder via the pure
  `reorderImages()` helper; exposes `{ url, sortOrder }[]` for forms to persist
  (e.g. against `PropertyImage`).
- `<SingleFileUploader kinds={[...]}>` — one-file sibling of `ImageUploader` for
  fields that accept a PDF _or_ an image (EPC certificate, floor plan); resolves
  the presign `kind` per-file from its mime type since the presign allowlist/size
  cap is a strict per-kind discriminator.

## Listings (Task 2.2)

- `GeocodingService` (`src/services/maps/`): `GoogleGeocodingService` (real
  Google Geocoding API, needs `GOOGLE_MAPS_SERVER_KEY`) + `MockGeocodingService`
  (deterministic lat/lng derived from the postcode string — realistic UK
  coords by postcode-area prefix, London-ish default for unrecognised areas).
  Selected by env in `src/services/maps/index.ts`; mock is active while H2.2 is
  unresolved (`docs/BLOCKERS.md`). `geocodePostcode()` wraps the provider with
  `cached()` (`src/lib/redis.ts`), keyed by normalised postcode, 30-day TTL.
- `ListingService` (`src/services/listings/`): `createDraft` / `updateDraft`
  (DRAFT only) / `submitForReview` / `transitionStatus` — the last enforces the
  status machine (`statusMachine.ts`: DRAFT → PENDING_REVIEW → LIVE →
  UNDER_OFFER → SOLD, terminal at SOLD, PENDING_REVIEW → LIVE is ADMIN-only,
  every other edge is AGENT-or-ADMIN with ownership checked for agents; one
  admin-only backwards edge, PENDING_REVIEW → DRAFT, was added in Task 2.3 for
  the moderation _reject_ path) and, when approving to LIVE,
  `assertWithinListingLimit` (`Subscription.listingLimit`, default free tier 3,
  missing subscription = free tier). `ListingServiceError` carries a `code`
  (`VALIDATION` / `NOT_FOUND` / `FORBIDDEN` / `TRANSITION_INVALID` /
  `LIMIT_EXCEEDED`) that route handlers map to an HTTP status via
  `listingErrorStatus()`. `transitionStatus` also takes an optional
  `extraData: Prisma.PropertyUpdateInput` (Task 2.3) so a caller can set extra
  columns atomically with the status change — e.g. `rejectionReason` on
  reject — and stamps `Property.submittedAt` whenever `to === PENDING_REVIEW`
  (first submission or a resubmission after a reject).
- Create/update Zod schemas (`src/services/listings/validation.ts`) are
  deliberately lenient (distress tags/EPC/images/pricing-safeguard all optional)
  so "Save Draft" works from any step once the DB's NOT NULL columns are
  satisfiable; `assertReadyForSubmission()` is the separate, stricter gate run
  by `submitForReview` (≥1 distress tag, pricing-safeguard acknowledged, EPC
  rating set). Money in, pence out: the wizard collects pounds and the API
  boundary (`buildListingPayload()`, client-side) converts to integer pence.
- `POST /api/listings`, `PATCH /api/listings/[id]`, `POST
/api/listings/[id]/submit` — thin, `requireRole('AGENT')` + Zod, all business
  logic in the service. On write, `location` is set via raw SQL
  (`ST_SetSRID(ST_MakePoint(lng, lat), 4326)`); `searchVector` is left to the
  Sprint 1 trigger, which fires on insert unconditionally and on update only
  when title/description/city/region/postcode are present in that write's `SET`
  clause — the wizard always resends the full form state, so every save keeps
  search current.
- `Property.pricingSafeguardAckAt` (migration
  `20260801190000_property_pricing_safeguard`, additive) records the agent's
  Step 3 confirmation that the asking price may change after survey and that
  any change will be disclosed to buyers — required before submission.
- `/agent/listings` (+ `/new`, `/[id]/edit`) — the 5-step wizard
  (`src/components/listings/ListingWizard.tsx`) is semi-controlled per step
  (`ImageUploader`'s contract) and calls the three routes above directly by
  `fetch`; edit is only offered while a listing is DRAFT.

## Admin moderation (Task 2.3)

- `ModerationService` (`src/services/listings/moderationService.ts`) —
  co-located with `ListingService` rather than `src/services/admin/` because it
  reuses `transitionStatus`/`statusMachine`/`ListingServiceError` directly and
  is really listing-domain logic, not user/admin-shell logic. Its own
  `MODERATION_LISTING_INCLUDE` adds `agentProfile.user` (for the notification
  email) on top of `ListingService`'s `LISTING_INCLUDE`.
  - `listPendingListings()` — `/admin/moderation` queue, `status =
PENDING_REVIEW`, ordered by `submittedAt` ascending (oldest submission first).
  - `getListingForModeration(propertyId)` — full-preview fetch, throws
    `NOT_FOUND` (code) if missing; no ownership filter (any admin, any listing).
  - `approveListing({ listingId, adminUserId })` — `transitionStatus(... to:
LIVE, extraData: { rejectionReason: null })` (sets `publishedAt`, re-asserts
    `assertWithinListingLimit`, clears any stale reason from an earlier reject),
    then an `AuditLog` row (`action: "LISTING_APPROVED"`, Sprint 1 pattern via
    `src/services/admin/audit.ts`), then `sendListingApprovedEmail()`.
  - `rejectListing({ listingId, adminUserId, reason })` — validates `reason`
    non-empty server-side (defence in depth beyond the route's Zod check, per
    AGENTS.md "business logic lives in services"), `transitionStatus(... to:
DRAFT, extraData: { rejectionReason: reason })`, an `AuditLog` row (`action:
"LISTING_REJECTED"`), then `sendListingRejectedEmail()`.
  - Both notification emails are **fire-and-forget** (`.catch(console.error)`,
    not awaited) — same convention as `registerUser`'s verification email — so
    a mailer outage never turns an already-committed approve/reject into a 500.
- `Property.rejectionReason` (nullable `TEXT`) and `Property.submittedAt`
  (nullable `TIMESTAMP`) — migration
  `20260801200000_property_moderation_fields`, additive. Neither column existed
  before Task 2.3 (checked `prisma/schema.prisma` first, per the task brief).
  `submittedAt` exists because `createdAt` is the wrong "submitted date" once a
  rejected listing is edited and resubmitted; it's set by `transitionStatus`
  itself (same mechanism as `publishedAt`), not by `ModerationService`.
- `POST /api/admin/listings/[id]/approve`, `POST
/api/admin/listings/[id]/reject` — thin, `requireRole('ADMIN')` + Zod
  (`rejectListingSchema`: `reason` non-empty after `.trim()`), all business
  logic in `ModerationService`.
- `/admin/moderation` — server component (`listPendingListings()`) rendering
  `<ModerationQueue>` (`src/components/admin/ModerationQueue.tsx`, client):
  table (title/agent/price/submitted) + a per-row "Review" modal with the full
  preview (photos, address, bedrooms, price, target ROI, EPC badge + cert
  link, floor plan link, distress tags, description) and Approve / Reject
  (reason textarea, required) actions; both call their route by `fetch` then
  `router.refresh()`. `/agent/listings` also surfaces a rejected listing's
  `rejectionReason` inline on its DRAFT row so the reason isn't write-only
  (email is the primary channel, but the agent shouldn't have to dig through
  their inbox to see why a resubmission is needed).

## Agent profile & credibility hub (Task 2.4)

- `AgentProfileService` (`src/services/agents/agentProfileService.ts`) — its
  own domain directory, separate from `src/services/listings/`: a distinct
  `AgentServiceError` code union (`VALIDATION` / `NOT_FOUND` / `FORBIDDEN` /
  `NOT_QUALIFIED` / `DUPLICATE` → `agentErrorStatus()`), same
  shape/HTTP-mapping pattern as `ListingServiceError` but no cross-imports.
  - `getAgentProfilePublic(agentProfileId)` — the public `/agents/[id]` fetch.
    Star rating (average + count of `Appraisal.rating`) and Verified
    Completed Deals (count of this profile's `Property.status = SOLD`) are
    computed **live** via `db.appraisal.aggregate`/`db.property.count`, not
    read from the `AgentProfile.rating`/`verifiedDealCount` columns — those
    two exist in the schema (`@default(0)`) but nothing writes to them; the
    brief itself defines both numbers as derived, and computing them live
    avoids a denormalised counter that would need to stay in sync with
    `transitionStatus` (listings) or appraisal creation (here too).
  - Case-study CRUD (`listCaseStudiesForOwnedProfile`/`createCaseStudy`/
    `updateCaseStudy`/`deleteCaseStudy`) — ownership-gated only (same
    "not found or not owned → `FORBIDDEN`" shape as
    `listingService.findOwnedAgentProfile`); deliberately does **not** also
    require `AgentProfile.active` — that gate is scoped to listing-ownership
    paths (Task 2.2/2.3), not credibility-hub content management.
  - `getAppraisalEligibility({ userId, role, agentProfileId })` — the
    qualification rule: role must be `INVESTOR` or `BUYER` (the brief's "may
    review" rule, despite the field being named `Appraisal.investorUserId`),
    no existing appraisal for this `(agentProfileId, investorUserId)` pair
    (the schema's own `@@unique`, re-checked here), and ≥1 `Enquiry` or
    `Deal` against any of this profile's listings (`Deal` has no direct
    `userId`; matched via `offer.buyerUserId`). Exported separately from
    `createAppraisal` so the public page can explain *why* a logged-in user
    can't review, not just reject the POST.
  - `createAppraisal(...)` re-validates the rating range and re-runs the
    eligibility check server-side regardless of what the route already
    validated (AGENTS.md: never trust the client) — `ALREADY_REVIEWED` maps
    to `DUPLICATE` (409), anything else ineligible maps to `NOT_QUALIFIED`
    (403).
- `POST /api/agents/[id]/appraisals` (`requireRole('INVESTOR', 'BUYER')`),
  `POST /api/case-studies` / `PATCH /api/case-studies/[id]` /
  `DELETE /api/case-studies/[id]` (`requireRole('AGENT')`, no ADMIN
  override — the brief's "owner-agent only" is literal) — thin, Zod
  (`src/services/agents/validation.ts`) → service → respond, same convention
  as `/api/listings/**`.
- `/agents/[id]` — public SSR page, no auth required to view: agency
  name/bio/compliance code, rating, verified deals, case studies
  (title/capex/net margin/narrative — `netMarginGBP` is money like every
  other `*GBP` field, not a percentage despite the sprint plan's loose "net
  margin %" shorthand), and appraisals (rating/review/reviewer
  name/date). Renders an `<AppraisalForm>` only for a logged-in user the
  server has already deemed eligible; otherwise an explanation
  (`WRONG_ROLE`/`NOT_QUALIFIED`/`ALREADY_REVIEWED`) or a login prompt — the
  POST itself is re-checked server-side regardless of what the page shows.
- `/agent/profile` — one card per owned `AgentProfile` with a
  `<CaseStudyManager>` (`src/components/agents/`, client): add/inline-edit/
  delete, pounds↔pence at the fetch boundary via the same
  `poundsToPence`/`penceToPoundsInput`/`formatPenceGBP` helpers the Task 2.2
  listing wizard already exports from `components/listings/wizardTypes.ts`
  (reused, not duplicated — that module has no server-only imports).
- **Multi-profile switching**: an agent nav selector
  (`<ActiveProfileSwitcher>` in `AgentLayout`, shown when the agent owns >1
  profile) persists the "active" profile in an httpOnly cookie
  (`ACTIVE_AGENT_PROFILE_COOKIE`, `src/lib/activeAgentProfile.ts`) rather than
  a new `User`/`AgentProfile` column — a migration wasn't justified for a
  value no server-side authorization check reads (every mutation still
  independently re-verifies ownership). `resolveActiveAgentProfileId(profiles,
  cookieValue)` is a pure function (cookie value if it's one of the user's
  own profiles, else the first — same order `listActiveAgentProfiles`
  returns). The `setActiveAgentProfile` server action
  (`src/app/agent/actions.ts`) re-fetches the caller's own
  `listActiveAgentProfiles(userId)` before writing the cookie — a
  stale/tampered value is simply never persisted. `/agent/listings/new` now
  seeds the listing wizard's default `agentProfileId` from this resolved
  active profile (previously always `profiles[0]`); the wizard's own
  per-listing override picker (Task 2.2) is unchanged.
- No migration for this task — `CaseStudy`, `Appraisal`, `Enquiry`,
  `Deal`/`Offer` already carried every field needed (checked
  `prisma/schema.prisma` first, per the task brief).

## Design system

Tokens defined once in `src/app/globals.css` (`@theme`): `primary #002147`,
`secondary #003580`, `accent #0066FF`, `surface #F5F8FF`, `pale #EBF2FF`,
`success #0A6640`, `intel #0099A8`, `warning #A05A00`, `danger #C0152A`,
`body #2D3A4A`, `muted #5A6A7A`, `line #D0DAE6` (the brief's "border" — renamed, see
ADR-002). Font: Inter with Calibri-equivalent fallbacks. Never hardcode brand hex
values in components.

## Testing & CI

- Unit: Vitest, `tests/unit/**` — services and pure logic; external providers always
  mocked.
- E2E: Playwright, `tests/e2e/**` — CI builds then serves on port 3100; locally
  reuses your dev server.
- CI (GitHub Actions): typecheck → lint → format:check → vitest; separate job builds
  and runs Playwright. Runs once the repo is pushed to GitHub (H1.1).

## Decisions log

| ADR                                                    | Decision                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| [ADR-001](adr/ADR-001-prisma-7-driver-adapter.md)      | Prisma 7 with `@prisma/adapter-pg` driver adapter (deviation: plan predates Prisma 7) |
| [ADR-002](adr/ADR-002-border-token-renamed-to-line.md) | Brand token `border` exposed as `line` to avoid Tailwind utility clash                |
| [ADR-003](adr/ADR-003-nextjs-16.md)                    | Next.js 16.2 — current stable; the brief's "Next.js 15" predates it                   |
| [ADR-004](adr/ADR-004-local-only-dev-phase.md)         | Local-only dev phase — online/launch tasks deferred with revive triggers              |
