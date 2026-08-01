# Sprint 2 Log — Agent Portal & Listing Engine (Weeks 3–4)

**Goal:** agents create rich distressed listings; admin approves; public detail
page v1. Branch: `sprint-2`.

## Task 2.1 — S3 upload service ✅ (2026-08-01)

`StorageService` interface (`src/services/storage/`) with `MockStorageService`
(active — writes via the dev-only `POST /api/uploads/dev` route to
`public/uploads/dev/`) and `S3StorageService` (real presigned POST, ready for
H1.4/H2.1). `POST /api/uploads/presign` (auth + Zod content-type/size gate) and
`<ImageUploader max={20}>` (drag-drop, previews, drag-reorder). Full detail:
`.superpowers/sdd/PropLink_Sprint_Plan_Claude_Code/task-2.1-report.md`.

## Task 2.2 — Multi-step listing form ✅ code-complete (2026-08-01)

### What was built

**`GeocodingService`** (`src/services/maps/`)

- `types.ts` — `GeocodeResult`, `GeocodingService` interface.
- `postcode.ts` — `normalisePostcode()` (uppercase, single space before the
  3-char inward code), `isValidUkPostcode()`.
- `mockGeocoding.ts` — `MockGeocodingService`: deterministic lat/lng from a
  hash of the normalised postcode, offset from a looked-up UK postcode-area
  centre (London, Manchester, Birmingham, Leeds, Bristol, Glasgow, Edinburgh,
  Liverpool, Newcastle, Sheffield, Cardiff, Nottingham, Oxford, Cambridge;
  London-ish default for unrecognised prefixes), clamped to a UK bounding box.
- `googleGeocoding.ts` — `GoogleGeocodingService`: real Google Geocoding API
  call, needs `GOOGLE_MAPS_SERVER_KEY`. Not exercised by tests.
- `index.ts` — selects the provider by env (`GOOGLE_MAPS_SERVER_KEY` presence);
  `geocodePostcode()` wraps it with `cached()` (`src/lib/redis.ts`), key
  `geocode:uk:<normalised postcode>`, 30-day TTL.

**`ListingService`** (`src/services/listings/`)

- `errors.ts` — `ListingServiceError` (`code`: `VALIDATION` / `NOT_FOUND` /
  `FORBIDDEN` / `TRANSITION_INVALID` / `LIMIT_EXCEEDED`) + `listingErrorStatus()`
  mapping each code to an HTTP status, shared by all three routes.
- `statusMachine.ts` — `canTransitionListingStatus()` / `assertListingTransition()`:
  DRAFT → PENDING_REVIEW → LIVE → UNDER_OFFER → SOLD, terminal at SOLD, every
  edge names its allowed role(s); PENDING_REVIEW → LIVE is ADMIN-only, the rest
  are AGENT-or-ADMIN (ownership checked separately in the service for agents).
- `validation.ts` — `createListingSchema` (lenient: only the DB's NOT NULL
  columns are required — title/description/address/postcode/propertyType/
  askingPriceGBP; distress tags/EPC/images/pricing-safeguard default empty/false
  so a draft can be saved from partway through the wizard) and
  `updateListingSchema` (`.partial()` of the same _without_ those defaults —
  important: a Zod `.default()` still fires on an absent key even under
  `.partial()`, so if the update schema had kept the defaults, an empty PATCH
  body would have silently reset `distressTags`/`images`/`bedrooms` to their
  defaults; caught by `listing-service.test.ts`'s "only writes fields present in
  the partial input" case before it shipped). `assertReadyForSubmission()` is
  the separate, stricter submit-time gate (≥1 distress tag, pricing-safeguard
  acknowledged, EPC rating set).
- `listingService.ts` — `createDraft`, `updateDraft` (DRAFT-only), `submitForReview`,
  `transitionStatus` (generic status-machine + ownership + listing-limit gate,
  reusable by Task 2.3's admin approve/reject route), `countLiveListings`,
  `assertWithinListingLimit` (`Subscription.listingLimit`, default free tier 3,
  missing subscription = free tier), `listActiveAgentProfiles`,
  `listListingsForAgentUser`, `getOwnedListing`/`getListingById`. Distress tags
  and images are written via delete-then-recreate inside `$transaction`.
  PostGIS `location` is set via `$executeRaw` (`ST_SetSRID(ST_MakePoint(lng,
lat), 4326)`) after every create/postcode-changing update; `searchVector` is
  left entirely to the Sprint 1 trigger (verified by reading the trigger DDL —
  it fires unconditionally on INSERT and on UPDATE only when
  title/description/city/region/postcode are in that write's `SET` clause; the
  wizard always resends the full form state on every save, so it keeps firing).

**Routes** (`src/app/api/listings/**`) — all `requireRole('AGENT')`, Zod →
service → respond:

- `POST /api/listings` → `createDraft`.
- `PATCH /api/listings/[id]` → `updateDraft`.
- `POST /api/listings/[id]/submit` → `submitForReview`.

**Schema** — additive migration
`prisma/migrations/20260801190000_property_pricing_safeguard/`: adds
`Property.pricingSafeguardAckAt` (nullable `TIMESTAMP`), the agent's Step 3
confirmation that the asking price may be revised after survey and that any
change will be disclosed to buyers before offers are accepted — required by
`assertReadyForSubmission` before submission, not before draft save.

**UI** (`src/app/agent/**`, `src/components/listings/**`)

- `/agent` (redirects to `/agent/listings`), `/agent/layout.tsx` (tab shell:
  Listings / Leads / Profile — the latter two are placeholders for Tasks 2.6/2.4,
  same pattern as Task 1.6's admin placeholder tabs).
- `/agent/listings` — the agent's listings (across all their `AgentProfile`s),
  status badge, asking price, edit link while DRAFT.
- `/agent/listings/new`, `/agent/listings/[id]/edit` — `<ListingWizard>`
  (`src/components/listings/ListingWizard.tsx`), 5 steps (`StepAddress`,
  `StepDetails`, `StepDistress`, `StepMedia`, `StepReview`), all 8
  `DistressTag`s as chip toggles, the pricing-safeguard confirmation checkbox,
  `<ImageUploader max={20}>` for photos, and a new `<SingleFileUploader>`
  (`src/components/uploads/`) for the EPC certificate and floor plan — both
  accept PDF _or_ image, so it resolves the presign `kind` per-file from the
  picked file's mime type rather than taking a single fixed `kind` prop like
  `ImageUploader` does. "Save Draft" is available once the core fields are
  filled (any step from that point on); "Submit for review" only appears on the
  Review step. Money: the UI collects pounds, converts to integer pence at the
  fetch-call boundary (`buildListingPayload()`); `formatPenceGBP()` is
  duplicated locally in `wizardTypes.ts` rather than imported from
  `services/metrics/globalMetrics` — that module imports `@/lib/db`, which
  cannot be pulled into a client bundle.
- Wired `<ToastProvider>` into the root layout (`src/app/layout.tsx`). It had
  only ever been mounted locally around the `/dev/ui` showcase page since Task
  1.5 built the primitive, so `useToast()` anywhere else in the app was
  previously a silent no-op — closed that gap since Save Draft/Submit feedback
  needed it to actually work.

### Deviations & decisions

1. **Listing-limit enforcement point.** The brief's acceptance criterion is "a
   4th LIVE listing is blocked". Only `status = LIVE` counts against
   `Subscription.listingLimit` (not PENDING_REVIEW/UNDER_OFFER) and the check
   runs inside `transitionStatus` exactly when `to === LIVE` — i.e. at admin
   approval, since only an admin can set LIVE. There is no dedicated
   approve-to-LIVE route yet (that's Task 2.3's admin moderation queue), so
   this task exercises the gate at the service level
   (`listing-service.test.ts`, `listing-limit.test.ts`) rather than through a
   browser flow; Task 2.3 should add the E2E coverage once its route exists.
2. **`agentProfileId` selection.** `AgentProfile` is per-agency and a `User` can
   own several (the seed agent has 3); registration doesn't create one
   automatically (that's Task 2.4's job). The wizard shows a profile picker
   only when the agent has more than one _and_ the listing hasn't been created
   yet (ownership can't be reassigned after; `updateListingSchema` doesn't
   even accept `agentProfileId`). An agent with zero profiles sees a "no
   agency profile yet" notice on `/agent/listings/new` instead of a broken
   form.
3. **Edit is DRAFT-only.** `updateDraft` throws `TRANSITION_INVALID` for any
   other status; the edit page renders a read-only notice instead of the
   wizard once a listing has moved past DRAFT. Nothing in the brief asked for
   editing a submitted/live listing, and doing so would bypass moderation.
4. **`pricingSafeguardAckAt` new column**, additive per AGENTS.md — see schema
   note above.
5. **Zod default/partial interaction caught by TDD.** Documented above under
   `validation.ts` — worth calling out separately because it's the kind of bug
   that would only show up as silent data loss in production (an agent
   re-saving a draft after just changing the price would have wiped their
   distress tags), not a thrown error.

### Test commands run

```
npm run typecheck    → clean (tsc --noEmit, no errors)
npm run lint         → clean (eslint, no errors/warnings)
npm run test         → 19 files, 148 tests passed (0 failed) — 73 new for this task:
                        listing-status-machine (11), geocoding-mock (16),
                        geocoding-cache (3), listing-validation (18),
                        listing-limit (4), listing-service (21),
                        listings-create-route (6), listings-update-route (5),
                        listings-submit-route (5)
npm run format:check → clean for every file this task touches; remaining
                        warnings are pre-existing files outside this task's
                        scope (task-2.*-brief.md, SPRINT-TRACKER.md)
npm run build        → succeeded (clean .next, re-run twice to confirm) — every
                        route (existing + new) renders dynamic (ƒ), consistent
                        with `auth()` in the shared SiteHeader making the whole
                        tree request-scoped
```

TDD followed throughout: `statusMachine`, `validation`, `listingService`,
geocoding and all three routes were written as failing tests first (confirmed
red via `Cannot find module` / `Cannot find export`), then implemented green.

**DB-backed verification blocked in this sandbox** — same pre-existing
constraint Task 2.1 hit and documented: no outbound reachability to the
Supabase pooler (`aws-1-eu-west-2.pooler.supabase.com`) from this shell.
Evidence gathered this task:

- `npx prisma migrate dev` → `Error: Schema engine error: FATAL: (ENOTFOUND)
tenant/user postgres.tznxdauihxgkietbppdd not found` — the new
  `pricingSafeguardAckAt` migration was hand-written (following the init
  migration's precedent for raw-SQL-authored migrations) instead of generated,
  and `npm run db:generate` (schema-only, no DB needed) was used to refresh the
  Prisma client types.
- `npx playwright test tests/e2e/agent-listing-wizard.spec.ts` → the
  `npm run start` webServer never becomes ready: every request to `/` hits the
  root layout's `MetricsStrip` → `getGlobalMetrics()` → the same DriverAdapterError,
  so Playwright's readiness probe times out after 120s. This is not specific to
  the new listing routes — it reproduces on `/` itself, i.e. it would block
  _any_ Sprint 1 or Sprint 2 E2E spec run from this shell right now, not just
  this task's.

**Commands the controller should run once DB access works, in order:**

```
npm run db:generate                 # refresh Prisma client (safe to run anytime)
npm run db:migrate                  # applies 20260801190000_property_pricing_safeguard
npm run dev                         # or npm run build && npm run start
npx playwright test tests/e2e/agent-listing-wizard.spec.ts
```

The Playwright spec logs in as the seeded `agent@proplink.test`, drives all 5
wizard steps (including a mid-flow "Save Draft"), submits, and asserts
`PENDING_REVIEW` via a direct DB query (`SELECT status FROM "Property"`) since
the `/admin/moderation` UI arrives in Task 2.3. It cleans up its own row in
`afterAll`.

## Checkpoint state

| Criterion                                            | State                                                                                                       |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Agent completes all 5 steps, submits                 | 🟡 code-complete + Playwright spec written; blocked on DB access to run it                                  |
| Listing appears in admin queue data (PENDING_REVIEW) | 🟡 same — asserted via DB query in the spec above                                                           |
| Limit blocks a 4th live listing                      | ✅ unit-tested at the service level (no admin approve route exists yet to drive it through HTTP — Task 2.3) |
| Business logic in `/src/services`; routes thin       | ✅                                                                                                          |
| Server-side RBAC + ownership on every mutation       | ✅ `requireRole('AGENT')` + ownership checks in the service                                                 |
| Money integer pence                                  | ✅ `askingPriceGBP`; UI converts pounds → pence at the fetch boundary                                       |
| EPC rating required before submission                | ✅ `assertReadyForSubmission`                                                                               |
| Migrations additive                                  | ✅ single nullable column add                                                                               |

## Task 2.3 — Admin moderation queue ✅ code-complete (2026-08-01)

### What was built

**`ModerationService`** (`src/services/listings/moderationService.ts`) —
co-located with `ListingService` rather than `src/services/admin/` because it
reuses `transitionStatus`/`statusMachine`/`ListingServiceError` directly (it's
listing-domain logic, not user/admin-shell logic):

- `listPendingListings()` — the `/admin/moderation` queue: `status =
PENDING_REVIEW`, ordered by `submittedAt` ascending (oldest first), with a
  dedicated `MODERATION_LISTING_INCLUDE` (adds `agentProfile.user` on top of
  `ListingService`'s own include, for the notification email).
- `getListingForModeration(propertyId)` — full-preview fetch for the "Review"
  modal and for building the notification email; `NOT_FOUND` if missing, no
  ownership filter (any admin can act on any PENDING_REVIEW listing).
- `approveListing({ listingId, adminUserId })` — routes the transition
  **through** `ListingService.transitionStatus` (`to: LIVE`), which already
  stamps `publishedAt` and re-asserts `assertWithinListingLimit` (the known
  gap called out in the brief — `transitionStatus` doesn't check
  `AgentProfile.active` itself, but does still enforce the free-tier cap of 3
  live listings, which is the requirement that matters for approve); passes
  `extraData: { rejectionReason: null }` to clear any stale reason from an
  earlier reject cycle. Then an `AuditLog` row (`LISTING_APPROVED`, Sprint 1
  pattern via `src/services/admin/audit.ts`) and a fire-and-forget
  `sendListingApprovedEmail()`.
- `rejectListing({ listingId, adminUserId, reason })` — validates `reason`
  non-empty **in the service**, not just at the route's Zod boundary (AGENTS.md:
  business logic lives in services); `transitionStatus(... to: DRAFT,
extraData: { rejectionReason: reason })`; `AuditLog` row (`LISTING_REJECTED`);
  fire-and-forget `sendListingRejectedEmail()` with the reason.
- Both emails are fire-and-forget (`.catch(console.error)`, not awaited) — same
  convention as `registerUser`'s verification email (`registration.ts`) — so a
  mailer outage never turns an already-committed approve/reject into a 500.

**`ListingService`/`statusMachine` extensions** (Task 2.2's files, extended not
forked):

- `statusMachine.ts` — added `PENDING_REVIEW → DRAFT`, **admin-only**: the one
  deliberate exception to "no backwards moves" in the otherwise-linear status
  machine, needed for the reject path (sprint-plan acceptance: "reject → back
  to DRAFT with reason").
- `transitionStatus` gained an optional `extraData?: Prisma.PropertyUpdateInput`
  param, merged into the same `UPDATE` call as the status change — lets
  approve/reject set `rejectionReason` atomically instead of a second write —
  and now also stamps `Property.submittedAt` whenever `to === PENDING_REVIEW`
  (covers both the first submission and a resubmission after a reject).
  Backwards-compatible: existing callers that don't pass `extraData` are
  unaffected (verified — all of Task 2.2's `transitionStatus` tests still pass
  unchanged).

**Schema** — additive migration
`prisma/migrations/20260801200000_property_moderation_fields/`:

- `Property.rejectionReason` (nullable `TEXT`) — checked `schema.prisma` first
  per the task brief; no such column existed.
- `Property.submittedAt` (nullable `TIMESTAMP`) — added because `createdAt` is
  the wrong "submitted date" for the moderation queue once a rejected listing
  is edited and resubmitted (the brief's required table column is "submitted
  date", not "created date"); set by `transitionStatus` itself, the same
  mechanism as `publishedAt`.

**Routes** (`src/app/api/admin/listings/[id]/**`) — new `/api/admin/**`
namespace (first admin API routes; Sprint 1's admin mutations used server
actions instead), both `requireRole('ADMIN')`, Zod → service → respond:

- `POST /api/admin/listings/[id]/approve` → `approveListing`.
- `POST /api/admin/listings/[id]/reject` → `rejectListing`, body validated by
  `rejectListingSchema` (`src/services/listings/validation.ts`): `reason`
  non-empty after `.trim()`.

**UI**

- `/admin/moderation` (`src/app/admin/moderation/page.tsx`) replaces the
  Sprint 1 placeholder tab — server component, `listPendingListings()`, renders
  `<ModerationQueue>`.
- `<ModerationQueue>` (`src/components/admin/ModerationQueue.tsx`, client) —
  table (Listing/Agent/Asking price/Submitted, `DataTable`) + a per-row
  "Review" button opening a `<Modal>` with the full preview required by the
  brief: photos grid, address, bedrooms, asking price, target ROI, `EpcBadge` +
  EPC certificate link, floor plan link, distress tags (`Badge`s), full
  description — plus Approve and Reject (reason textarea, required, disabled
  submit until non-empty) actions. Both actions `fetch` their route, toast the
  result, and `router.refresh()` (same pattern as `ListingWizard.tsx`) so the
  queue re-fetches server-side and the acted-on listing drops out of the
  PENDING_REVIEW list.
- `/agent/listings` — the DRAFT row now shows `Rejected: <reason>` inline when
  `rejectionReason` is set, so the persisted reason isn't write-only (the email
  is the primary channel per the brief, but an agent shouldn't have to dig
  through their inbox to find out why a listing bounced back).

### Deviations & decisions

1. **`ModerationService` location.** Brief allowed either
   `src/services/listings/` or `src/services/admin/`; chose the former for
   cohesion with `transitionStatus`/`statusMachine`/`ListingServiceError` (all
   in the same directory) — it reuses them directly rather than wrapping them.
2. **Two additive columns, not one.** The brief only named `rejectionReason`
   explicitly; `submittedAt` was added because the brief's own required
   moderation-table column is "submitted date", and no existing column
   captures that correctly (see schema section above).
3. **`extraData` on `transitionStatus`** rather than a second `UPDATE` call or
   a forked reject-specific transition function — keeps the status change and
   `rejectionReason` atomic in one write, and is fully backwards-compatible
   with Task 2.2's existing callers/tests.
4. **Reason validated in the service, not just Zod.** Defence in depth per
   AGENTS.md ("business logic lives in services") — `rejectListing` throws
   `ListingServiceError` (`VALIDATION`) on a blank/whitespace-only reason even
   if called directly, not only via the Zod-guarded route.
5. **Fire-and-forget notification emails.** Matches the existing
   `requestEmailVerification` convention in `registration.ts` — an approve/
   reject that already committed to the DB must not become a 500 because the
   (currently mock/console) mailer had a bad day.
6. **`rejectionReason` surfaced on `/agent/listings`.** Not explicitly required
   by the brief, but a persisted, agent-facing field that only ever appears in
   an admin email would be a real usability gap; the addition is a single
   conditional line, no new route/service needed (the field was already
   returned by `listListingsForAgentUser`'s unfiltered `findMany`).

### Test commands run

```
npm run typecheck    → clean (tsc --noEmit, no errors)
npm run lint         → clean (eslint, no errors/warnings)
npm run test         → 22 files, 184 tests passed (0 failed) — 36 new for this task:
                        listing-status-machine (+2: admin reject edge allowed/denied),
                        listing-service (+4: submittedAt stamp, admin reject transition,
                          agent-forbidden-from-reject, extraData merge),
                        moderation-service (11: queue query, 404, approve incl. limit
                          gate + wrong-status + not-found, reject incl. blank reason +
                          trimming + wrong-status + not-found),
                        admin-listings-approve-route (5: 401/403/200/409/404),
                        admin-listings-reject-route (9: 401/403/invalid-JSON/blank
                          reason/whitespace reason/missing reason/200/404/409)
npm run format:check → clean for every file this task touches; remaining
                        warnings are pre-existing files outside this task's
                        scope (task-2.*-brief.md)
npm run build        → succeeded — new routes present: /admin/moderation,
                        /api/admin/listings/[id]/approve,
                        /api/admin/listings/[id]/reject (all ƒ dynamic,
                        consistent with the rest of the request-scoped tree)
```

TDD followed throughout: `statusMachine`'s new edge, `transitionStatus`'s
`extraData`/`submittedAt` extension, `moderationService.ts`, and both new
routes were written as failing tests first (confirmed red via `Cannot find
module`/`Cannot find export`), then implemented green.

`npx prisma generate` (schema-only, no DB needed) was used to refresh the
Prisma client types for the two new `Property` columns — same approach Task
2.2 used for `pricingSafeguardAckAt`.

**DB-backed verification blocked in this sandbox** — same pre-existing
constraint Tasks 2.1/2.2 hit: no outbound reachability to the Supabase pooler
from this shell, so `db:migrate` and the Playwright spec below were not run
here (per this task's explicit instructions, not attempted).

**Commands the controller should run once DB access works, in order:**

```
npm run db:generate                      # refresh Prisma client (safe anytime)
npm run db:migrate                       # applies 20260801200000_property_moderation_fields
npm run dev                              # or npm run build && npm run start
npx playwright test tests/e2e/admin-moderation.spec.ts
```

The spec (`tests/e2e/admin-moderation.spec.ts`) drives the Task 2.2 wizard
(same steps as `agent-listing-wizard.spec.ts`) as `agent@proplink.test` to get
a fresh PENDING_REVIEW listing, then:

- **Approve test**: logs in as `admin@proplink.test`, opens `/admin/moderation`,
  clicks "Review" then "Approve"; asserts the listing drops out of the queue,
  a direct DB query shows `status = LIVE` + `publishedAt` set + one
  `LISTING_APPROVED` AuditLog row, then logs back in as the agent and asserts
  the `LIVE` badge is visible on `/agent/listings` (the sprint-plan acceptance
  criterion).
- **Reject test**: same setup, fills the rejection-reason textarea, clicks
  "Reject"; asserts the listing drops out of the queue, `status = DRAFT` +
  `rejectionReason` matches + one `LISTING_REJECTED` AuditLog row, then asserts
  the agent sees the `Rejected: <reason>` note on `/agent/listings`.

Both tests clean up their own rows (`Property` + `AuditLog`) in `afterAll`,
same convention as the Sprint 1/2 specs.

## Checkpoint state (Task 2.3)

| Criterion                                                  | State                                                                                              |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `/admin/moderation` real page (table + full preview)       | ✅                                                                                                 |
| Approve → LIVE + `publishedAt` + AuditLog + agent email    | ✅ unit-tested; 🟡 E2E written, blocked on DB access                                               |
| Reject → DRAFT + reason persisted + AuditLog + agent email | ✅ unit-tested; 🟡 E2E written, blocked on DB access                                               |
| Listing-limit re-asserted on approve                       | ✅ (`transitionStatus`'s existing `assertWithinListingLimit`, unit-tested via `moderationService`) |
| Reject requires non-empty reason (Zod + service)           | ✅                                                                                                 |
| Routes thin + Zod; `requireRole('ADMIN')` server-side      | ✅                                                                                                 |
| Business logic in `/src/services`                          | ✅                                                                                                 |
| Migrations additive                                        | ✅ two nullable column adds                                                                        |

## Task 2.4 — Agent profile & credibility hub ✅ code-complete (2026-08-01)

### What was built

**`AgentProfileService`** (`src/services/agents/`, new domain directory —
separate from `src/services/listings/` on purpose: distinct error-code union,
no reuse of `ListingServiceError`/`transitionStatus`):

- `errors.ts` — `AgentServiceError` (`code`: `VALIDATION` / `NOT_FOUND` /
  `FORBIDDEN` / `NOT_QUALIFIED` / `DUPLICATE`) + `agentErrorStatus()`, same
  shape/HTTP-mapping pattern as `listings/errors.ts` (AGENTS.md: one pattern,
  not a bespoke shape per service).
- `validation.ts` — `createCaseStudySchema`/`updateCaseStudySchema`
  (`capexGBP` non-negative, `netMarginGBP` signed — a case study can honestly
  report a loss — both integer pence, capped at the same £20m sanity ceiling
  as `MAX_ASKING_PRICE_PENCE`) and `createAppraisalSchema` (`rating` 1..5
  integer, `review` 10–2000 chars).
- `agentProfileService.ts`:
  - `getAgentProfilePublic(agentProfileId)` — the `/agents/[id]` fetch: star
    rating (`Appraisal.rating` average + count via `db.appraisal.aggregate`)
    and Verified Completed Deals (`db.property.count({ status: SOLD })`)
    computed **live**, not read from the `AgentProfile.rating`/
    `verifiedDealCount` columns the schema carries as unused `@default(0)`
    placeholders — see decision 1 below.
  - `listCaseStudiesForOwnedProfile`, `createCaseStudy`, `updateCaseStudy`,
    `deleteCaseStudy` — full CRUD, ownership-gated (`findOwnedProfile`/
    `findOwnedCaseStudy`, same "not found or not owned → `FORBIDDEN`" shape
    as `listingService.findOwnedAgentProfile`); `updateCaseStudy` only writes
    fields present in the partial input (same convention as
    `listingService.updateDraft`).
  - `getAppraisalEligibility({ userId, role, agentProfileId })` — the
    qualification rule: role must be `INVESTOR`/`BUYER`, no existing
    `Appraisal` for this `(agentProfileId, investorUserId)` pair, and ≥1
    `Enquiry` or `Deal` on any of this profile's listings (`Deal` has no
    direct `userId`, so it's matched via `offer.buyerUserId`). Exported
    separately from `createAppraisal` so the public page can explain *why* a
    logged-in user can't review, not just refuse the POST.
  - `createAppraisal(...)` — server-enforced end to end: re-validates the
    rating range in the service (not just Zod, matching the schema's own "1..5,
    checked in service layer" comment), 404s on an unknown profile, then
    re-runs `getAppraisalEligibility` and maps `ALREADY_REVIEWED` → `DUPLICATE`
    (409), everything else ineligible → `NOT_QUALIFIED` (403).

**Multi-profile switching** (`src/lib/activeAgentProfile.ts`,
`src/app/agent/actions.ts`, `src/components/agents/ActiveProfileSwitcher.tsx`):

- Persisted via an httpOnly cookie (`proplink_active_agent_profile`), not a
  new `User`/`AgentProfile` column — lightest fit per the brief, no migration.
- `resolveActiveAgentProfileId(profiles, cookieValue)` — pure function
  (cookie value if it names one of the user's own profiles, else the first,
  same alphabetical order `listActiveAgentProfiles` already returns);
  unit-testable without mocking Next's request-scoped APIs.
- `setActiveAgentProfile` server action — re-fetches the caller's own
  `listActiveAgentProfiles(userId)` (Task 2.2's existing function; not
  duplicated) and silently no-ops for any id not in that list before writing
  the cookie: server-verified, the cookie is never trusted as proof of
  ownership on its own.
- `AgentLayout` (`/agent/**` tab shell) now fetches the session's active
  profiles and renders `<ActiveProfileSwitcher>` next to the "Agent portal"
  heading when the agent owns >1 (a static agency-name label for exactly 1;
  nothing for 0, unchanged from before).
- `/agent/listings/new` now seeds the wizard's `agentProfileId` from the
  resolved active profile instead of always `profiles[0]` — the *only* change
  to Task 2.2's wizard; its own per-listing override picker
  (`ListingWizard`'s `<Select>`, shown only for a brand-new listing when the
  agent has >1 profile) is untouched, so an agent can still list under a
  different profile than their nav-level "active" one for one listing without
  that changing their active selection.

**Public `/agents/[id]` page** (`src/app/agents/[id]/page.tsx`, SSR, no auth
required to view) — agency name, bio, compliance code, a logo-placeholder
avatar (initial-in-a-circle, no real asset), star rating + review count (or
"No reviews yet"), Verified Completed Deals, case studies (title/capex/net
margin/description, `formatPenceGBP` — reused, not duplicated, from
`components/listings/wizardTypes.ts`, which is already a plain
server-and-client-safe module), and the appraisals list (rating, review,
reviewer name via `Appraisal.investor.name`, date). Below the case studies:
a `<AppraisalForm>` (client) for a logged-in user the server has already
confirmed is eligible; otherwise an explanation (`WRONG_ROLE`/
`NOT_QUALIFIED`/`ALREADY_REVIEWED`) or a login prompt for a guest. The POST
itself is re-checked server-side regardless — the form's visibility is a UX
courtesy, not the security boundary.

**Case-study CRUD UI** (`/agent/profile`, replacing the Task 1.6/2.2
placeholder) — one card per owned `AgentProfile` (agency name, compliance
code, "View public profile" link to `/agents/[id]`), each with a
`<CaseStudyManager>` (client): add/inline-edit/delete, pounds↔pence at the
fetch boundary via the same `poundsToPence`/`penceToPoundsInput` helpers the
listing wizard uses.

**Routes** (thin, Zod → service → respond, same convention as
`/api/listings/**`):

- `POST /api/agents/[id]/appraisals` → `requireRole('INVESTOR', 'BUYER')` →
  `createAppraisalSchema` → `createAppraisal`.
- `POST /api/case-studies` → `requireRole('AGENT')` → `createCaseStudySchema`
  → `createCaseStudy`.
- `PATCH /api/case-studies/[id]` / `DELETE /api/case-studies/[id]` →
  `requireRole('AGENT')` → `updateCaseStudy`/`deleteCaseStudy`.

**No migration.** Checked `schema.prisma` first per the task brief:
`CaseStudy`, `Appraisal`, `Enquiry`, `Deal`/`Offer` already carry every field
this task needed (`capexGBP`, `netMarginGBP`, `rating`, the
`@@unique([agentProfileId, investorUserId])` one-review-per-user constraint).

### Deviations & decisions

1. **Rating/deal-count computed live, not read from `AgentProfile.rating`/
   `verifiedDealCount`.** Those two columns exist in the schema
   (`@default(0)`) but nothing writes to them anywhere in the codebase — the
   brief itself defines both numbers as derived ("average of Appraisal.rating
   ... show count", "count of ... SOLD listings"). Computing them live means
   there's no denormalised counter to keep in sync with `transitionStatus`
   (owned by Task 2.2/2.3) or `createAppraisal` (this task) — one less place
   for drift bugs, at the cost of two extra queries per profile-page view (no
   caching added; revisit if that page's traffic ever needs it — AGENTS.md's
   "cache before you call" is scoped to external provider calls, not DB
   reads). The two legacy columns are left as-is; not in scope to remove.
2. **`netMarginGBP` treated as money (pence), not a percentage**, despite the
   required-specifics doc's shorthand "net margin %". The schema field is
   `netMarginGBP` — `GBP` suffix, `Int`, same convention as every other money
   column — and the original master-plan schema line
   (`docs/PropLink_Sprint_Plan_Claude_Code.md:157`) confirms it. Schema is the
   source of truth per AGENTS.md's money convention; the brief prose is
   informal shorthand.
3. **Case-study CRUD does NOT check `AgentProfile.active`.** The task's
   framing note scopes that gate to "listing ownership paths" (Task 2.2/2.3);
   an agent should still be able to manage their credibility hub content even
   if a profile is flagged inactive. Only ownership is enforced, per the
   brief's literal "owner-agent only, server-enforced ownership".
4. **No ADMIN override on case-study/appraisal routes**, unlike listing
   mutations (where `transitionStatus` lets an admin act on any listing).
   Case studies are "owner-agent only" and appraisals are "Investors/buyers
   only" per the brief — neither carves out an admin exception, so
   `requireRole` is scoped tightly (`AGENT` only; `INVESTOR`/`BUYER` only).
5. **Appraisal eligibility is INVESTOR *or* BUYER**, even though the schema
   field is `Appraisal.investorUserId` — the brief's "may review" rule says
   "Investors/buyers only", so both qualifying roles are accepted; the field
   name predates this task and wasn't renamed (renaming would be a
   non-additive schema change, out of scope).
6. **Active-profile cookie, not a new column.** Considered a `User.
   activeAgentProfileId` field, but that's a migration for a value that is
   purely a UI convenience and never read by any server-side authorization
   check (every mutation still re-verifies ownership independently, e.g.
   `createDraft`'s own `findOwnedAgentProfile`) — a cookie is strictly
   lighter and the brief explicitly invited "cookie or user field — pick the
   lightest fit".
7. **Case-study image is a plain "Image URL" text field**, not the Task 2.1
   `<ImageUploader>`/`<SingleFileUploader>`. The brief's accept criterion is
   "case study renders with capex/margin"; `imageUrl` is nullable and no
   image-upload requirement was stated. Wiring the uploader in is a natural
   follow-up, not done here to keep this task's surface matched to its
   acceptance criteria.

### Test commands run

```
npm run typecheck    → clean (tsc --noEmit, no errors)
npm run lint         → clean (eslint, no errors/warnings) after two test-file
                        touch-ups (an unused import, an unused destructure —
                        both fixed to match existing test conventions)
npm run test         → 28 files, 254 tests passed (0 failed) — 70 new for this
                        task: active-agent-profile (5), agent-validation (15),
                        agent-profile-service (28: aggregates, case-study CRUD
                        + ownership, qualification rule, appraisal creation),
                        agent-appraisal-route (8), case-studies-routes (11),
                        agent-actions (3)
npm run format:check → clean for every file this task touches; remaining
                        warnings are pre-existing files outside this task's
                        scope (task-2.*-brief.md, docs/BLOCKERS.md)
npm run build        → succeeded — new routes present: /agent/profile
                        (already existed as a placeholder, now real),
                        /agents/[id], /api/agents/[id]/appraisals,
                        /api/case-studies, /api/case-studies/[id] (all ƒ
                        dynamic, consistent with the rest of the
                        request-scoped tree)
```

TDD followed throughout: `resolveActiveAgentProfileId`, the validation
schemas, `agentProfileService.ts` (aggregates, ownership, qualification rule,
appraisal creation), both new route files, and the `setActiveAgentProfile`
server action were all written as failing tests first (confirmed red via
`Cannot find package`), then implemented green in one pass each.

**DB-backed verification blocked in this sandbox** — same pre-existing
constraint Tasks 2.1–2.3 hit: no outbound reachability to the Supabase pooler
from this shell. Per this task's explicit instructions, `db:migrate` was not
needed (no migration — see above) and the Playwright spec below was not run
(confirmed only via `--list`, which doesn't touch the DB).

**Commands the controller should run once DB access works, in order:**

```
npm run dev                              # or npm run build && npm run start
npx playwright test tests/e2e/agent-profile-hub.spec.ts
```

The spec (`tests/e2e/agent-profile-hub.spec.ts`) has two tests:

- **Case study rendering**: logs in as `agent@proplink.test`, adds a case
  study via `/agent/profile`'s `<CaseStudyManager>` for the seeded "Northgate
  Distressed Assets" profile (`complianceCode = PL-AG-0001`, looked up by SQL
  rather than hardcoding its id), then visits `/agents/<id>` (no login) and
  asserts the title, `£45,000` capex and `£22,000` net margin, and the
  narrative all render.
- **Unqualified appraisal rejection**: logs in as `investor@proplink.test`
  (no `Enquiry`/`Deal` fixtures exist against any agent in the seed data, so
  this user is unqualified by construction) against the "Mercia Probate
  Properties" profile (`PL-AG-0002`, a different profile than the first test
  to avoid any shared-state race under Playwright's `fullyParallel`); asserts
  the public page shows the ineligibility reason instead of a review form,
  **and** that a direct `page.request.post` to
  `/api/agents/<id>/appraisals` (sharing the same browser-context cookies)
  returns 403 — proving the qualification rule is enforced server-side, not
  just hidden in the UI. Cleans up its own `CaseStudy`/`Appraisal` rows in
  `afterAll`.

## Checkpoint state (Task 2.4)

| Criterion                                                          | State                                                       |
| -------------------------------------------------------------------| ------------------------------------------------------------ |
| `/agents/[id]` renders agency info, rating, verified deals, compliance code | ✅ |
| Case studies render with capex/margin (narrative + optional image) | ✅ unit-tested; 🟡 E2E written, blocked on DB access        |
| Appraisals list (rating, review, reviewer name, date)               | ✅                                                          |
| Unqualified user cannot post an appraisal (server-enforced)         | ✅ unit-tested (role/qualification/duplicate); 🟡 E2E written, blocked on DB access |
| One appraisal per user per profile                                  | ✅ (`Appraisal`'s existing `@@unique`, re-checked in the service) |
| Case-study CRUD, owner-agent only                                   | ✅ unit-tested (ownership + partial-update semantics)       |
| Multi-profile switcher in agent nav; listing creation uses it        | ✅                                                          |
| Business logic in `/src/services`; routes thin                      | ✅                                                          |
| Server-side RBAC + ownership + qualification                        | ✅                                                          |
| Money integer pence (`capexGBP`/`netMarginGBP`)                     | ✅ UI converts pounds → pence at the fetch boundary          |
| Migrations additive                                                 | ✅ none needed — schema already had every field             |

**Sprint 2 in progress. Next: Task 2.5 — Property detail page v1.**
