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
    separately from `createAppraisal` so the public page can explain _why_ a
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
  resolved active profile instead of always `profiles[0]` — the _only_ change
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
5. **Appraisal eligibility is INVESTOR _or_ BUYER**, even though the schema
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

| Criterion                                                                   | State                                                                               |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `/agents/[id]` renders agency info, rating, verified deals, compliance code | ✅                                                                                  |
| Case studies render with capex/margin (narrative + optional image)          | ✅ unit-tested; 🟡 E2E written, blocked on DB access                                |
| Appraisals list (rating, review, reviewer name, date)                       | ✅                                                                                  |
| Unqualified user cannot post an appraisal (server-enforced)                 | ✅ unit-tested (role/qualification/duplicate); 🟡 E2E written, blocked on DB access |
| One appraisal per user per profile                                          | ✅ (`Appraisal`'s existing `@@unique`, re-checked in the service)                   |
| Case-study CRUD, owner-agent only                                           | ✅ unit-tested (ownership + partial-update semantics)                               |
| Multi-profile switcher in agent nav; listing creation uses it               | ✅                                                                                  |
| Business logic in `/src/services`; routes thin                              | ✅                                                                                  |
| Server-side RBAC + ownership + qualification                                | ✅                                                                                  |
| Money integer pence (`capexGBP`/`netMarginGBP`)                             | ✅ UI converts pounds → pence at the fetch boundary                                 |
| Migrations additive                                                         | ✅ none needed — schema already had every field                                     |

## Task 2.5 — Property detail page v1 ✅ verified (2026-08-07)

**First Sprint 2 task verified end-to-end against a real database.** The
Supabase blocker was worked around on 2026-08-01 with a local Homebrew
`postgresql@18` + PostGIS instance (see `BLOCKERS.md`), so this task ran the
full ladder — unit tests, production build, Playwright, Lighthouse — rather
than stopping at "code-complete".

### What was built

**`StaticMapService`** (`src/services/maps/`) — a second provider interface in
the maps domain alongside Task 2.2's `GeocodingService`:

- `staticMapTypes.ts` — `StaticMapParams`, `StaticMapService`
  (`getMapImageUrl`/`getSatelliteImageUrl`). Both return a URL string rather
  than fetching: Google Static Maps is an `<img src>` API, so there is no
  network round-trip for AGENTS.md's "cache before you call" to apply to
  (deliberate, not an oversight — noted here because every other external
  provider in this codebase _is_ cached).
- `mockStaticMap.ts` — `MockStaticMapService`: an inline SVG (grid, pin,
  coordinate caption) as a `data:` URI, so the page renders offline with no key
  and no placeholder asset checked into `public/`.
- `googleStaticMap.ts` — `GoogleStaticMapService`: real Static Maps URLs
  (`maptype=roadmap`/`satellite`), needs `GOOGLE_MAPS_API_KEY` — the
  **browser-restricted** key, distinct from Task 2.2's `GOOGLE_MAPS_SERVER_KEY`.
- `index.ts` — exports `staticMapService`, provider chosen by env presence,
  exactly as `geocodingService` already was.

**`EnquiryService`** (`src/services/enquiries/`, new domain directory) —
`errors.ts` (`EnquiryServiceError` + `enquiryErrorStatus`, the same shape as
`listings/errors.ts` and `agents/errors.ts`), `validation.ts`
(`createEnquirySchema`: `message` 10–2000 chars, optional `contactPhone`), and
`enquiryService.ts` (`createEnquiry` — gates on the same public-visibility rule
as the page, creates the row, then fire-and-forget emails the owning agent).

**`ListingService` extensions** (Task 2.2's file, extended not forked):

- `isPubliclyVisibleStatus(status)` — LIVE/UNDER_OFFER/SOLD; shared by the page
  _and_ the enquiry service so the two can't drift apart.
- `getListingForPublicView({ propertyId, viewer })` — returns `null` (→ 404)
  for a non-public listing unless the viewer is an ADMIN or the owning agent.
- `getListingCoordinates(propertyId)` — reads the PostGIS point back with
  `ST_Y`/`ST_X` on a `::geometry` cast (`geography` has no direct accessors),
  mirroring how Task 2.2's `setPropertyLocation` writes it.

**Route** — `POST /api/enquiries`: `requireRole()` (logged in, any role) → Zod →
service → 201, with a `// TODO(H1.5)` for the Upstash rate limit per the brief.

**UI** — `/marketplace/[id]` (SSR + `generateMetadata`), `<PropertyGallery>`
(main image + keyboard-accessible thumbnail tabs), `<PropertyMap>` (map/
satellite toggle), `<EnquiryForm>`; plus `SITE_URL` (`src/lib/siteUrl.ts`)
feeding the root layout's `metadataBase` so relative canonical/OG URLs resolve
to absolute ones.

**No migration.** `Enquiry` already carried every column this task needed.

### Deviations & decisions

1. **Enquiries require a login.** `Enquiry.fromUserId` is non-null and the
   brief explicitly forbids weakening the schema, so a logged-out visitor gets
   a login prompt where the form would be and the route 401s. Both halves are
   E2E-asserted (UI _and_ a direct POST) — the hidden form is a courtesy, the
   route is the boundary.
2. **`contactPhone` is folded into the stored `message`**, not given a column.
   One optional field didn't justify a migration; it is prepended to the
   persisted message (so Task 2.6's leads list keeps it) and passed separately
   to the notification email for a cleaner body.
3. **Non-public listings 404 rather than 403** — a 403 confirms the id exists.
   Owner/admin previews render with a banner and `robots: noindex`, and carry
   no enquiry form.
4. **Fire-and-forget enquiry email**, matching `registration.ts` and
   `moderationService.ts`: a committed enquiry must not 500 on a mailer outage.
5. **`StaticMapService` returns URLs, not fetched bytes** — see the cache note
   above.

### Defects found by running the code

Recorded in full because Tasks 2.1–2.4 have not yet had a live-DB run, and
three of these five would not have surfaced from review alone:

1. **500 on any listing with no PostGIS point.** `getListingCoordinates`
   returned `{ lat: null, lng: null }` (the row exists; `ST_Y(NULL)` is NULL),
   and the page handed that to `StaticMapService`, which called `.toFixed()` on
   `null`. Reproduced by the owner-preview of a DRAFT. Fixed in
   `listingService.ts` + regression test in `listing-service.test.ts`.
2. **`Badge tone="warning"` failed WCAG AA** at 4.31:1 (`#a05a00` on the `/15`
   tint, 12px) — distress-tag chips use that tone. Lightened to `/10` (4.61:1)
   in `src/components/ui/badge.tsx`; the brand token is untouched. The same
   audit showed `tone="intel"` at 2.89:1, which **no tint can fix** — `#0099a8`
   is too light to be a foreground colour. Nothing renders `tone="intel"` yet,
   so it carries a `TODO(a11y)` and a `BLOCKERS.md` row instead of a unilateral
   brand change.
3. **Missing `<main>` landmark** on `/marketplace/[id]`; fixed there and on
   `/agents/[id]` — the two publicly indexed pages. Every `/agent/**` and
   `/admin/**` page has the same gap but is behind auth and noindex; queued for
   the Sprint 6 hardening pass rather than fixed piecemeal.

### Test-harness races fixed on the way (E2E suite)

Running the suite repeatedly — rather than once — turned up three independent
flakes. None was a product bug; all three were silently eroding the value of
every spec in the suite, so they are fixed rather than retried away.

4. **`week2-auth.spec.ts` failed on a different role each run.** `registerUser`
   fires `requestEmailVerification` without awaiting it (deliberately — a mailer
   outage must not fail registration), so `createToken`'s "invalidate previous
   unused tokens" `deleteMany` could land _after_ the 201 and delete the token
   the spec had just hand-inserted. The spec now waits for the app's own token
   row and rewrites its hash instead of racing a competing insert.
5. **Per-worker fixture prefixes collided.** Every spec tags its rows with
   `` `<prefix>-${Date.now()}` `` and deletes `LIKE '<prefix>%'` in `afterAll` —
   but under `fullyParallel: true` the module is loaded, and `afterAll` runs,
   **once per worker**. Two workers loading in the same millisecond shared a
   prefix, so the first to finish tore down the other's fixtures mid-test. That
   was the ~1-in-5 `admin-moderation` failure (the reject test's listing
   vanished from `/agent/listings`). New helper
   `tests/e2e/helpers/runId.ts` folds the worker index and pid into the prefix;
   all six specs use it.
6. **The login click could land before hydration and be lost forever.** The
   sign-in helper polled `/api/auth/session` after clicking submit — but polling
   the post-condition can never recover a click that never ran `onSubmit`, so it
   just burned its timeout. The five near-identical copies of that helper are now
   one `tests/e2e/helpers/login.ts`, which waits on the credentials-callback
   response to prove the submit fired and retries the whole navigate/fill/click
   sequence if it didn't.
7. **The new spec needed `test.describe.configure({ mode: "default" })`** —
   same per-worker `beforeAll`/`afterAll` mechanics as (5): its shared fixtures
   collided on the primary key and one worker's teardown deleted rows another
   was still reading. `"default"` keeps the file in one worker without
   `"serial"`'s skip-the-rest-on-first-failure behaviour.

### Test commands run

```
npm run typecheck    → clean
npm run lint         → clean
npm run test         → 31 files, 296 tests passed (0 failed) — 42 new:
                        enquiry-service (12), enquiries-route (8),
                        static-map-service (7), listing-service visibility +
                        coordinates (+15, incl. the null-point regression)
npm run format:check → clean for every file this task touches
npm run build        → succeeded — /marketplace/[id] and /api/enquiries present (ƒ)
npx playwright test  → 22 passed (0 failed), 10 consecutive runs, no flakes
                        (before the harness fixes above: 3 failures in 13 runs)
npx lighthouse       → SEO 100 · Accessibility 100 · Best practices 96
```

Lighthouse ran against `npm run start` on a seeded LIVE listing. Accessibility
was 95 before the badge-contrast and `<main>` fixes above. The one
best-practices finding is the fixture's fake `/uploads/dev/*.jpg` 404ing — test
data, not a page defect.

`tests/e2e/marketplace-detail.spec.ts` (5 tests): LIVE listing renders
gallery/chips/EPC/price/ROI/map/agent card/placeholders · SEO metadata is
server-rendered · a logged-in buyer's enquiry lands as exactly one `NEW`
`Enquiry` row with the phone preserved · an anonymous visitor gets a login
prompt and a 401 with no row written · a DRAFT 404s publicly but previews for
its owning agent with `noindex` and no enquiry form.

## Checkpoint state (Task 2.5)

| Criterion                                                        | State                                                       |
| ---------------------------------------------------------------- | ----------------------------------------------------------- |
| `/marketplace/[id]` SSR with SEO meta + OpenGraph + canonical    | ✅ E2E-asserted                                             |
| Gallery, distress chips (warning token), EPC badge, price, ROI   | ✅ E2E-asserted                                             |
| Static map pin + satellite view via service interface + mock     | ✅                                                          |
| Agent card linking to `/agents/[id]`                             | ✅                                                          |
| Placeholders labelled "coming online in a later week"            | ✅                                                          |
| Post Enquiry → `Enquiry` row + agent email                       | ✅ row E2E-asserted; email unit-asserted against the mock   |
| Only LIVE/UNDER_OFFER/SOLD public; owner/admin preview; else 404 | ✅ E2E-asserted both ways                                   |
| Lighthouse SEO ≥ 90                                              | ✅ 100                                                      |
| Business logic in `/src/services`; routes thin                   | ✅                                                          |
| Money integer pence, formatted at the display boundary           | ✅                                                          |
| Migrations additive                                              | ✅ none needed                                              |
| Public POST rate-limited                                         | ⏭ `TODO(H1.5)` — Upstash keys absent, existing BLOCKERS row |

### Retro-verification of Tasks 2.1–2.4

Running the whole suite also cleared the 🟡 "E2E written, blocked on DB access"
rows those tasks carried: `agent-listing-wizard.spec.ts`,
`admin-moderation.spec.ts` and `agent-profile-hub.spec.ts` all pass against the
local PostGIS database (22 tests across the suite, 10 consecutive clean runs).
Their checkpoint tables above are now backed by actual runs.

Two caveats worth carrying forward. First, `db:migrate` has still never been run
against Supabase — the two Sprint 2 migrations are applied locally only, so the
Supabase project needs `npm run db:migrate` after H1.2 is restored. Second, the
suite exercises the **mock** Storage/Geocoding/StaticMap/mailer providers
throughout; the real S3, Google and Resend implementations remain unexercised by
any test, by design (AGENTS.md: tests never hit live APIs) — they need a manual
smoke test when H1.4/H1.7/H2.2 land.

## Task 2.6 — Agent leads & analytics v1 ✅ verified (2026-08-07)

### What was built

**Schema** — additive migration
`prisma/migrations/20260807120000_property_view_count/`: `Property.viewCount`
(`INTEGER NOT NULL DEFAULT 0`, existing rows backfill in place). Saves are
deliberately **not** denormalised alongside it: a save already has an owning
`SavedProperty` row to count, so there is no counter to keep in sync.

**`analytics.ts`** (`src/services/listings/`, co-located with `ListingService`
like `moderationService.ts`):

- `VIEWED_LISTINGS_COOKIE` + `parseViewedListings`/`serialiseViewedListings` —
  the session-scoped list of listing ids this browser has been counted for,
  capped at `MAX_TRACKED_VIEWS = 50` (browsers cap a cookie at ~4KB; an
  unbounded list would eventually be truncated mid-id and start double-counting).
- `shouldCountListingView(...)` — pure, so the dedupe and self-view rules are
  unit-testable with no DB and no Next request APIs. Not counted: a repeat view
  in the same session, the owning agent's own view, any admin's view.
  **Counted**: a _different_ agent's view — they are a genuine visitor.
- `recordListingView(...)` — applies the rule, increments, and hands the
  (possibly unchanged) session list back for the caller to persist.
- `getAgentProfileAnalytics(...)` — listings/views/saves/leads/new-leads for the
  `/agent/leads` strip.

**`savedProperties.ts`** — `saveListing` (upsert: a double-click isn't a unique
violation), `unsaveListing` (`deleteMany`: removing a non-existent save is the
desired end state, not a P2025), `isListingSavedBy`. `saveListing` enforces
public visibility; `unsaveListing` deliberately does not, so a buyer can always
un-save a listing that has since bounced back to DRAFT.

**`EnquiryService` additions** — `listEnquiriesForAgentProfile` (newest first,
ownership re-verified) and `updateEnquiryStatus` (ownership via the enquiry's
listing's profile — _any_ profile the agent owns qualifies, not just the active
one). `EnquiryErrorCode` gained `FORBIDDEN` → 403.

**Routes** — `PATCH /api/enquiries/[id]` (`requireRole('AGENT')`),
`POST /api/listings/[id]/view` (**no** role gate — see decision 1),
`POST`/`DELETE /api/listings/[id]/save` (`requireRole('BUYER', 'INVESTOR')`).

**UI** — `<ViewTracker>` (beacon, ref-guarded against React 19 Strict Mode's
double-invoked effects, failures swallowed), `<SaveButton>` (optimistic, reverts
on failure), the real `/agent/leads` (5-tile analytics strip + `<LeadsTable>`
whose per-row status `<select>` PATCHes then `router.refresh()`es, so what you
see after the toast is server state), and Views/Saves columns on
`/agent/listings`.

### Deviations & decisions

1. **The view beacon is a route handler, not the page render.** A React Server
   Component cannot set cookies during render, and the per-session dedupe needs
   to write one. Bonus: a counted view then means "a browser that runs JS
   rendered this page", closer to a real visit than a crawler fetching HTML.
2. **Cookie, not Redis, for the dedupe window.** The brief allowed either. A
   cookie works for anonymous visitors (no session id at all), and Upstash is
   unresolved (H1.5) — a Redis set would silently no-op locally, making the
   graceful-fallback path the _only_ path and the feature untestable end to end.
   A session cookie (no `maxAge`) **is** the "once per session" window.
3. **A different agent's view counts**; only the owner and admins are excluded,
   so an agent can't inflate their numbers by refreshing and moderation traffic
   doesn't pollute them.
4. **`/agent/leads` is scoped to the active profile**, not every profile the
   agent owns — otherwise one agency's leads bleed into another's, and the strip
   sums to something meaningless. Ownership is re-verified server-side.
5. **Lead status is free-form, not a one-way machine.** Listing status is a
   machine because its transitions carry legal/commercial weight; a lead is a
   worklist item and an agent may legitimately reopen one closed too early. The
   brief asks only that changes persist.
6. **Saving is BUYER/INVESTOR only** — a demand-side signal, so an agent
   bookmarking their own stock (or an admin browsing) would pollute the metric.

### Fixed along the way

**`Badge tone="intel"` contrast (2.89:1)** — deferred at the end of Task 2.5 as
"needs a brand decision". It didn't: pairing the intel _tint_ with
`text-primary` ink gives 13.5:1 with no token change — the same
dark-ink-on-light-band pattern `EpcBadge` already uses for bands C–E. Task 2.6
forced the issue by making the tone reachable (`UNDER_OFFER` maps to it on
`/agent/listings`). All five tones now pass AA: success 5.56, warning 4.65,
danger 4.80, intel 13.5, default 10.3. The `BLOCKERS.md` row moved to Resolved.

### Test commands run

```
npm run typecheck    → clean
npm run lint         → clean
npm run test         → 35 files, 353 tests passed (0 failed) — 57 new:
                        listing-analytics (20), leads-routes (17),
                        saved-properties (10), enquiry-leads (10)
npm run format:check → clean for every file this task touches
npm run build        → succeeded — /agent/leads, /api/enquiries/[id],
                        /api/listings/[id]/view, /api/listings/[id]/save (ƒ)
npx prisma migrate deploy → 20260807120000_property_view_count applied locally
npx playwright test  → 28 passed (0 failed), 7 consecutive runs, no flakes
```

TDD throughout — all four unit-test files were confirmed red (`Cannot find
package` / `is not a function`) before any implementation existed.

`tests/e2e/agent-leads-analytics.spec.ts` (6 tests): a view increments once per
session and **not** on reload · a fresh browser context counts as a new view ·
the owning agent's own view doesn't count · a buyer saves, the agent's Saves
column reads 1, and unsaving removes the row · a lead's status change persists in
the DB and survives a reload · a non-agent PATCHing a lead gets 403 with the
status unchanged.

Its fixture listing is `UNDER_OFFER` rather than `LIVE`: publicly visible either
way, but only LIVE counts against the free tier's 3-listing cap, and the seed's
single agent user owns all three profiles — so a LIVE fixture would eat the
headroom `admin-moderation.spec.ts`'s approve test needs. Latent rather than
observed, but removed at the source instead of left to surface in CI.

## Checkpoint state (Task 2.6)

| Criterion                                          | State                                                       |
| -------------------------------------------------- | ----------------------------------------------------------- |
| `/agent/leads` lists enquiries across the agency   | ✅ E2E-asserted                                             |
| Lead status management, persisted                  | ✅ E2E-asserted incl. reload                                |
| View counter increments on detail-page view        | ✅ E2E-asserted                                             |
| Deduped per session (reload → no second increment) | ✅ E2E-asserted, plus new-context → new view                |
| Owner-agent / admin views not counted              | ✅ unit + E2E (owner)                                       |
| Saves aggregated per listing, shown to the agent   | ✅ E2E-asserted on `/agent/listings`                        |
| Public save/unsave for logged-in BUYER/INVESTOR    | ✅ E2E-asserted both directions; role enforced server-side  |
| `updateStatus` ownership (foreign agent refused)   | ✅ unit (foreign profile 403) + E2E (non-agent 403)         |
| Business logic in `/src/services`; routes thin     | ✅                                                          |
| Server-side RBAC + ownership on every mutation     | ✅                                                          |
| Migrations additive                                | ✅ one column, NOT NULL with DEFAULT                        |
| Rate limiting on the new public POST               | ⏭ `TODO(H1.5)` — Upstash keys absent, existing BLOCKERS row |

## Task 2.7 — Seed data ✅ verified (2026-08-07)

### What was built

- `prisma/seedListings.ts` — the demo catalogue as **pure data**, so `seed.ts`
  stays a thin writer: 12 UK cities with hardcoded coordinates, 10 distress
  themes covering all 8 `DistressTag` values, and a deterministic generator for
  40 listings. No `Math.random()` anywhere — re-seeding must not reshuffle the
  demo, and AGENTS.md forbids a seed calling a live geocoder.
- `prisma/seed.ts` — extended from 4 users + 3 profiles into named steps:
  `seedUsers`, `seedAgentProfiles`, `seedAgentSubscription`, `seedListings`,
  `seedCaseStudies`, `seedEnquiriesAndAppraisals`, `seedSavedProperties`.
- `public/uploads/seed/plate-01..06.svg` — six local placeholder plates.

**Verified counts:** 40 listings (30 LIVE / 5 PENDING_REVIEW / 3 UNDER_OFFER /
2 SOLD) · 180 images, 3–6 each · all 8 distress tags · all 7 EPC bands ·
£45,000–£450,000 in integer pence · ROI 8.0–29.5% · 12 cities · PostGIS
`location` on 40/40 · FTS `searchVector` on 40/40 · 3 case studies · 5
appraisals · 9 enquiries · 12 saves · 8 users.

### Deviations & decisions

1. **Local SVG plates, not `picsum.photos`.** The brief allowed either and asked
   which. Local wins: the detail page must render with no network (no
   guaranteed outbound access here, and the E2E suite runs offline), and a
   remote 404 shows up as a Lighthouse best-practices failure. Lighthouse on
   `seed-listing-01` now scores **100/100/100** — best practices was 96 while
   Task 2.5's fixture used fake image URLs.
2. **Deterministic ids + upserts, not delete-then-recreate.** `Property` has no
   natural unique key and the seeded `Enquiry`/`SavedProperty`/`Appraisal` rows
   reference these listings — recreating would orphan or cascade them on every
   run. Child collections (images, tags) are replaced wholesale scoped to their
   own listing, the same way `ListingService.updateDraft` does.
3. **The seeded agent gets an ELITE `Subscription` (`listingLimit: 100`).**
   Without it the catalogue is unapprovable: `transitionStatus` re-asserts
   `assertWithinListingLimit` on every move to LIVE, the free-tier default is 3,
   and all three seeded profiles belong to one agent user — so with 30 LIVE demo
   listings the moderation queue could never approve a 31st, and Task 2.3's
   approve E2E would fail. An agency with this much stock would be on a paid
   plan in reality, so the seed says so rather than special-casing the limit.
4. **Four extra demand-side users** (`investor2/3@`, `buyer2/3@`) — `Appraisal`
   is unique per (agentProfileId, investorUserId), so five reviews from the two
   original users would have stacked onto the same profile pages.
5. **Enquiries are seeded before appraisals, and every appraisal has one.** The
   qualification rule is server-enforced; an appraisal without the enquiry
   behind it would be demo data the product itself would refuse to create.
   Verified by SQL — all five (reviewer, profile) pairs have exactly one.
6. **Profiles are read back ordered by `complianceCode`, not `agencyName`** —
   the catalogue's `profileIndex` means PL-AG-0001/2/3, and the default
   alphabetical order would silently reassign every listing to another agency.
7. **One case study reports a loss** (−£4,500). `netMarginGBP` is signed for
   exactly this reason, and a credibility hub that only ever shows wins reads as
   marketing copy.

### Two existing E2E specs updated

Seed data is shared fixture state, so growing it changed what two specs see:

- `agent-profile-hub.spec.ts` — the seed now publishes a case study on
  PL-AG-0001, so a page-level `getByTestId("case-study-capex")` matched two
  elements and tripped strict mode. Scoped to the card carrying the test's own
  title.
- `week2-admin.spec.ts` — the "seeded DB has no LIVE listings yet" comment on
  the metrics assertion is no longer true (£5,867,400 of inventory). The
  assertion was already format-based and correct; the comment now says why an
  exact figure would be a moving target.

### Test commands run

```
npm run db:seed      → clean; run twice, identical counts (idempotent)
npm run typecheck    → clean
npm run lint         → clean
npm run test         → 35 files, 353 tests passed (unchanged — the brief asks
                        for no unit tests beyond the seed running clean)
npm run format:check → clean for every file this task touches
npm run build        → succeeded
npx playwright test  → 28 passed (0 failed), 5 consecutive runs against the
                        fully-seeded database, no flakes
npx lighthouse /marketplace/seed-listing-01 → SEO 100 · a11y 100 · best practices 100
```

## Checkpoint state (Task 2.7)

| Criterion                                                  | State                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| 40 listings across UK cities, varied tags/EPC/prices       | ✅ 12 cities, all 8 tags, all 7 EPC bands                           |
| Prices £45k–£450k in integer pence                         | ✅                                                                  |
| Real-ish postcodes + lat/lng, PostGIS `location` set       | ✅ 40/40, hardcoded — no live geocoding                             |
| FTS `searchVector` populated by the Sprint 1 trigger       | ✅ 40/40                                                            |
| 3–6 images per listing, rendering locally                  | ✅ local SVG plates, works offline                                  |
| Status mix demos marketplace, queue and post-offer badges  | ✅ 30/5/3/2                                                         |
| 3 case studies · 5 appraisals with qualifying enquiries    | ✅ qualification verified by SQL                                    |
| Extra enquiries for `/agent/leads`, saves for the counters | ✅ 9 enquiries, 12 saves                                            |
| Seed idempotent; existing users/profiles unbroken          | ✅ re-run clean                                                     |
| Seed calls no live external APIs                           | ✅                                                                  |
| Runs clean against **Supabase**                            | ⏭ H1.2 paused — verified against the local PostGIS instance instead |

---

# Sprint 2 — Definition of Done

**PASSED 2026-08-07.** All seven tasks complete and verified against a real
database (local PostGIS; Supabase still paused — H1.2).

| Sprint 2 DoD criterion                                                      | State                                                                           |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Agent can create a rich distressed listing through a guided flow            | ✅ 5-step wizard, E2E-driven end to end                                         |
| Admin can approve/reject, with reason and audit trail                       | ✅ `/admin/moderation`, both paths E2E-asserted incl. `AuditLog`                |
| Public property detail page with SEO                                        | ✅ Lighthouse SEO 100 (≥ 90 required), a11y 100, best practices 100             |
| Enquiries reach the agent (row + email)                                     | ✅ row E2E-asserted, email unit-asserted against the mock mailer                |
| Agent credibility hub (rating, verified deals, case studies)                | ✅ `/agents/[id]`, aggregates computed live                                     |
| Leads management + listing analytics                                        | ✅ `/agent/leads`, views deduped per session, saves counted                     |
| Demo-ready catalogue                                                        | ✅ 40 listings, 12 cities, every tag and EPC band                               |
| Business logic in `/src/services`; routes thin (Zod → service)              | ✅ across all seven tasks                                                       |
| Server-side RBAC + ownership on every mutation                              | ✅ incl. negative E2E cases (401/403 with no write)                             |
| Money integer pence in all `*GBP` fields                                    | ✅ pounds↔pence converted only at UI/fetch boundaries                           |
| EPC displayed on every listing                                              | ✅                                                                              |
| Migrations additive                                                         | ✅ three: `pricingSafeguardAckAt`, `rejectionReason`+`submittedAt`, `viewCount` |
| External providers behind interfaces with mocks; tests never call live APIs | ✅ Storage, Geocoding, StaticMap, Mailer                                        |
| Test suite                                                                  | ✅ 353 unit + 28 Playwright green; 10 consecutive clean suite runs              |
| Vercel/CI deploy criteria                                                   | ⏭ deferred per ADR-004                                                          |

**Carried into Sprint 3:**

- `npm run db:migrate` has never run against Supabase — all three Sprint 2
  migrations are applied locally only. Run it when H1.2 is restored.
- The real S3, Google Maps and Resend implementations are written but
  unexercised by any test, by design (AGENTS.md: tests never hit live APIs).
  They need a manual smoke test when H1.4/H1.7/H2.2 land.
- Rate limiting is a `TODO(H1.5)` on all four public POST endpoints
  (`/api/enquiries`, `/api/enquiries/[id]`, `/api/listings/[id]/view`,
  `/api/listings/[id]/save`).
- `<div>`-wrapped `/agent/**` and `/admin/**` pages still lack a `<main>`
  landmark — behind auth and noindex, queued for the Sprint 6 hardening pass.

**Sprint 2 complete. Next: Sprint 3 (Weeks 5–6) — Search, Map & Commute.**
