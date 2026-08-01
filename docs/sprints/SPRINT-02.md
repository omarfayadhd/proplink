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

**Sprint 2 in progress. Next: Task 2.3 — Admin moderation queue** (needs the
approve-to-LIVE route that will finally let the listing-limit gate and the
PENDING_REVIEW → LIVE transition be driven end-to-end through the browser).
