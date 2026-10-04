# Sprint 3 Log — Search, Map & Commute (Weeks 5–6)

**Goal:** a buyer or investor can find a property by text, filters, map and
commute time; Maps costs guarded by cache + quota; saved-search alerts flowing.
Branch: `sprint-2` until Sprint 3 gets its own.

## Task 3.1 — SearchService (interface-first) ✅ verified (2026-08-07)

### What was built

**`src/services/search/`** — new domain directory, four modules:

- `types.ts` — `SearchParams`, `SearchResultItem`, `SearchResult`, and the
  `SearchService` interface (`search` + `count`). Every param is optional: an
  empty `SearchParams` is the valid "browse everything marketable" query the
  `/marketplace` landing state issues.
- `queryBuilder.ts` — **pure**: params in, a parameterised `Prisma.Sql` out.
  Raw SQL rather than the Prisma query API because the three things that make
  this search worth having have no Prisma expression: the FTS `tsvector` (the
  Sprint 1 trigger), pg_trgm `similarity()`, and PostGIS `ST_DWithin` / the `&&`
  bbox operator. Enum parameters are cast (`$1::"EpcRating"`) rather than
  casting the column, which would defeat the index.
- `postgresSearchService.ts` — the thin execute-and-map layer. Rows and count
  run in parallel (the count is needed for pagination on the same render).
- `validation.ts` — `parseSearchParams(URLSearchParams)`, the single boundary
  between a URL and `SearchParams`.
- `index.ts` — exports the active `searchService`. No env switch and no mock,
  unlike Storage/Geocoding/StaticMap: search runs on the Postgres the app
  already requires, so there is no credential to be missing and nothing to fall
  back to.

**Routes** — `GET /api/search` (the result envelope) and `GET /api/search/count`
(the live counter). Both public — the marketplace is the shop window — and both
carry a `TODO(H1.5)` rate-limit note.

**Test infrastructure** — a new `tests/integration/**` category running against
the real database, wired into the same `npm run test` and skipping itself when
`DATABASE_URL` is unset. `tests/setup/env.ts` loads `.env.local` for it.

### Deviations & decisions

1. **Search excludes SOLD; UNDER_OFFER stays in.** The plan doesn't say which
   statuses are searchable. SOLD listings remain publicly viewable on
   `/marketplace/[id]` and still feed an agent's Verified Completed Deals, but
   they are not stock a buyer can act on. UNDER_OFFER stays because those deals
   fall through often enough that hiding them would cost real leads, and the
   card carries a status badge.
2. **A pure query builder, separate from the service.** The alternative —
   building SQL inside the service — would have made "unit tests cover each
   filter + combinations" impossible without a database. `Prisma.Sql` exposes
   `.text` and `.values`, so each filter is asserted precisely, and one test
   fails if a user value ever reaches `.text` instead of `.values`.
3. **`tests/integration/` is a new category, not more unit tests.** The
   acceptance criteria include "p95 query < 150ms on seeded data (use EXPLAIN
   ANALYZE)" — impossible against a mock, and so is any real check that PostGIS
   and pg_trgm agree with the SQL being generated. Folded into `npm run test`
   rather than a separate script so it can't rot unrun; `describe.skipIf`
   keeps a DB-less CI job green.
4. **Malformed URL params are dropped, not rejected.** Zod guards request
   _bodies_, where a 400 is the right answer. A URL a user can mangle by
   deleting one character should degrade to a broader search, not a 400 — and
   Task 3.2 keeps the entire page state in the query string, so the same parser
   has to serve both sides and mean the same thing.
5. **Money travels the URL in pounds** (`maxPrice=250000`), converted to pence
   at the parse boundary. A shared link should be readable; pence stays
   internal, per AGENTS.md.
6. **Every ordering ends with `"id" ASC`.** Without a unique tiebreaker, rows
   with equal sort keys swap between page requests and a listing shows up twice
   — or never — as a user pages. There is an integration test that pages the
   whole result set and asserts no repeats and no drops.
7. **`relevance` without a query degrades to `newest`** — `ts_rank` against an
   empty tsquery scores every row 0, leaving the order undefined.
8. **`bbox` beats `centre`** when both arrive: they come from different UI
   affordances (drag the map vs. "within N km"), and applying both would
   silently intersect two areas.

### Test commands run

```
npm run typecheck    → clean
npm run lint         → clean
npm run test         → 40 files, 446 tests passed (0 failed) — 93 new:
                        search-query-builder (31), search-service (12),
                        search-validation (14), search-routes (7),
                        integration/search-service (29)
npm run format:check → clean for every file this task touches
npm run build        → succeeded — /api/search and /api/search/count present (ƒ)
```

TDD throughout: the builder, service, parser and both routes were each written
as failing tests first (confirmed red via `Cannot find package`), then
implemented green.

**Performance** — against the Task 2.7 seed catalogue, the heaviest combination
(text + price + EPC bands + two distress tags + a 50km radius + relevance sort)
measured over 20 runs, plus an `EXPLAIN ANALYZE` on the count query. Both assert
< 150ms and both pass with a wide margin.

**Integration coverage** (29 tests, real DB): every filter narrows correctly ·
`distressTags` is a union, not an intersection, and never duplicates a row ·
the radius is kilometres, not metres (a 1-metre radius returns nothing) · bbox
returns only rows inside the box · FTS finds words and city names · the trigram
fallback finds "Manchestor" where FTS alone returns 0 · sorts are ordered ·
paging the whole set repeats and drops nothing · `count` agrees with `search`.

### Checkpoint state (Task 3.1)

| Criterion                                                  | State                                                     |
| ---------------------------------------------------------- | --------------------------------------------------------- |
| `SearchService.search(params)` behind an interface         | ✅ `PostgresSearchService`                                |
| `q` — FTS with trigram fallback                            | ✅ integration-tested, including a misspelling            |
| maxPrice / epcBands / region / type / minBedrooms / minRoi | ✅ unit + integration                                     |
| `distressTags` ANY match                                   | ✅ union semantics asserted explicitly                    |
| `bbox` or `centre + radiusKm` (PostGIS)                    | ✅ both, with bbox taking precedence                      |
| Sort: newest / price / roi / relevance                     | ✅ plus a stable tiebreaker on every one                  |
| Pagination                                                 | ✅ clamped page size; full-set paging asserted lossless   |
| Real-time result count endpoint                            | ✅ `GET /api/search/count`, no rows fetched               |
| Unit tests cover each filter + combinations                | ✅ 64 unit tests across builder/service/parser/routes     |
| p95 < 150ms on seeded data, EXPLAIN ANALYZE sanity check   | ✅ both asserted in CI-able tests, not just measured once |
| Business logic in `/src/services`; routes thin             | ✅                                                        |
| Money integer pence                                        | ✅ pounds→pence at the URL boundary only                  |
| Migrations additive                                        | ✅ none needed — Sprint 1 shipped the indexes and trigger |

## Task 3.2 — Search UI ✅ verified (2026-08-07)

### What was built

**`queryString.ts`** (`src/services/search/`) — `buildSearchQueryString`, the
exact inverse of `parseSearchParams`. Tested as a **round trip**
(`parse(build(p)) === p`) rather than only field-by-field: agreeing on nine keys
individually and still losing a search between them is precisely the failure
mode a shareable-URL feature has.

**`/marketplace`** (`src/app/marketplace/page.tsx`) — SSR. Reads the query
string, calls `searchService.search`, renders the grid. Server-rendered so a
shared or crawled URL returns the actual search rather than an empty shell that
fills in on hydration.

**`<SearchFilters>`** (client) — text box, budget slider, EPC multi-select,
distress-tag chips, property type, bedrooms, minimum ROI, sort, and a
"Clear filters" reset. Every change debounces at 300ms, then rewrites the URL
via `router.replace` and refetches `/api/search/count`.

**`<PropertyCard>`** (server component — nothing on it is interactive, so it
costs no client JS): photo, price, title, city/postcode/beds, EPC badge, ROI
badge, up to three distress chips, an "Under offer" badge, and the
commute-time placeholder for Task 3.4.

**`<SearchPagination>`** — real `<Link>`s, not buttons, so a page of results
stays a distinct shareable, crawlable URL and works without JS.

### Deviations & decisions

1. **The URL is the state.** The sidebar rewrites the query string and the
   server component re-renders from it; local React state exists only to keep
   inputs responsive between keystroke and debounce. The alternative — client
   state as the source of truth with the URL mirroring it — gives you two copies
   to drift apart, and back/forward stops working.
2. **The live count comes from `/api/search/count`, not from the rendered
   results.** It has to answer "how many would this find?" while the user is
   still dragging the slider, before results have been fetched. An incrementing
   request id discards a slow early response that lands after a fast later one,
   which would otherwise show a stale number.
3. **The client component imports `queryString.ts` and `types.ts` directly, not
   the `@/services/search` barrel.** The barrel re-exports
   `PostgresSearchService`, which imports `@/lib/db` — Prisma cannot go into a
   client bundle. Same trap Task 2.2 documented for `formatPenceGBP`.
4. **The budget slider's top stop means "no limit", not "£500,000".** Emitting
   `maxPrice=500000` at the top of the range would silently exclude anything
   above it, and the seed catalogue tops out at exactly £450,000 — so the bug
   would have looked like correct behaviour.
5. **Changing a filter returns to page 1.** Staying on page 7 of a suddenly
   narrower result set shows an empty grid that looks like "no matches".
6. **Defaults are omitted from the URL** (`page=1`, `sort=newest`, empty
   filters). Otherwise one search has several URLs, which splits caches and
   analytics and makes shared links noisy.
7. **Cards show at most three distress chips** with a "+N more" overflow. A
   listing can carry all eight, and a card wrapping to four rows of chips stops
   being scannable.

### Fixed along the way

**Heading order on `/marketplace`.** Cards used `<h3>` under the page's single
`<h1>`, skipping a level — a Lighthouse `heading-order` failure (a11y 98) and a
genuine problem for anyone navigating by headings. Cards are `<h2>` now: a11y
back to 100.

### Test commands run

```
npm run typecheck    → clean
npm run lint         → clean
npm run test         → 41 files, 462 tests passed (0 failed) — 16 new
                        (search-query-string round trips)
npm run format:check → clean for every file this task touches
npm run build        → succeeded — /marketplace present (ƒ)
npx playwright test  → 41 passed (0 failed), 5 consecutive runs, no flakes
                        — 13 new in marketplace-search.spec.ts
npx lighthouse /marketplace → SEO 100 · accessibility 100 · best practices 100
```

TDD: `buildSearchQueryString` was written test-first (confirmed red via
`Cannot find package`). The UI itself was driven by the Playwright spec, which
found a real test defect on first run — the URL-restore case snapshotted
`page.url()` before the debounced rewrite landed, where every other assertion
used auto-retrying `expect(page).toHaveURL()`.

`tests/e2e/marketplace-search.spec.ts` (13 tests): cards carry price and EPC ·
a card links to its detail page · text search narrows and syncs to the URL ·
the EPC filter leaves only the selected bands · the distress-tag filter reduces
the count · every result respects the budget cap · type and bedroom filters
apply · price sort is genuinely ordered · **a shared URL restores both the
filter controls and the exact same result ids** · clearing filters widens the
set again · pagination never repeats a listing and keeps the sort · an empty
result explains itself · a mangled URL still returns 200 with results.

## Checkpoint state (Task 3.2)

| Criterion                                                          | State                                                    |
| ------------------------------------------------------------------ | -------------------------------------------------------- |
| `/marketplace` filter sidebar (budget, EPC, tags, type, beds, ROI) | ✅                                                       |
| Text box                                                           | ✅                                                       |
| Live count                                                         | ✅ debounced `/api/search/count`, stale-response guarded |
| Results grid of PropertyCards (photo, price, tags, EPC, ROI)       | ✅                                                       |
| Distance/commute placeholder                                       | ✅ labelled for Task 3.4                                 |
| URL-synced params (shareable searches)                             | ✅ round-trip unit-tested + E2E-asserted                 |
| Playwright: each filter narrows results                            | ✅                                                       |
| Playwright: URL restore reproduces the search                      | ✅ controls **and** result ids                           |
| Design tokens only                                                 | ✅                                                       |
| Money integer pence                                                | ✅ pounds only in the URL and the display                |

## 🏁 Week 5 checkpoint

**PASSED 2026-08-07** — "every filter combination returns correct results
through a polished search page with live counts and shareable URLs." Filter
correctness is asserted twice over: against generated SQL in unit tests, and
against real rows in `tests/integration/search-service.test.ts`.

**Sprint 3 Week 6 next: Tasks 3.3 (map & density grid) and 3.4 (commute engine)
— both blocked on H3.1**, the Google Maps browser key. Unlike every other
provider in this build, the plan flags this one as needed even locally: Google
Maps JS will not render without a real key. Task 3.5 (saved searches & alerts)
is not blocked and could be brought forward.

## Landing-page redesign (unplanned, 2026-08-25)

Not a sprint-plan task — requested directly after the seeded marketplace made
the state of `/` obvious. The old page was the Week-2 placeholder: a white hero
with duplicate `Create an account` / `Log in` buttons (both already in
`SiteHeader`), five flat description cards, and above all of it the full-width
`MetricsStrip` reading `0 Completed Syndicate Deals · £0 Accrued Success Fees ·
0 Vetted Referrals Routed`.

**What changed**

- `MetricsStrip` out of the root layout; the metrics now render in the landing
  hero via `<HeroStats>`, which omits zero-valued ones — **ADR-005**. The
  component itself is kept for the signed-in portal shells.
- `getLandingStats()` and `formatCompactPenceGBP()` added to
  `src/services/metrics/globalMetrics.ts` (live listing count, mean target ROI,
  `£5.87M`-style abbreviation) — unit-tested in `tests/unit/global-metrics.test.ts`.
- `/` rebuilt: gradient hero with one primary CTA into `/marketplace` and one
  secondary into `/register` (the duplicate `Log in` is gone), a live
  "Latest distressed listings" row through the marketplace's own
  `<PropertyCard>`, a four-step "one loop" section, the five portal cards with
  inline-SVG glyphs, and an inset closing CTA card (inset, because a full-bleed
  navy band directly above the navy `SiteFooter` read as one undifferentiated
  slab).
- `<PropertyCard compact>` suppresses the "Commute times coming in a later week"
  note. It stays on `/marketplace`, where it reads as the roadmap note it is;
  on the landing page it read as an unfinished product.

**Tests.** `tests/e2e/landing.spec.ts` rewritten — hero stats present, **no
zero-valued metric on the page**, both CTAs, showcase cards ≤ 3, no commute
note, and "View all N listings" navigating to `/marketplace`. The Task 1.5
acceptance check in `week2-admin.spec.ts` was retargeted at the hero stats and
no longer pins the metric count at four. Full suite: 466 unit + integration,
42 Playwright, all green.

### Second pass — editorial/luxury restyle (same day)

The product owner supplied a reference (a Dribbble "Luxury Real Estate Agency"
shot) and asked for that design language on our palette. Dribbble cannot be
fetched, so the shot was read from a screenshot they pasted.

**What the reference contributes**, all mapped onto existing `--color-*` tokens
— no palette change:

- Inset `rounded-[2rem]` hero plate with page margin around it, its navy radial
  wash standing in for hero photography.
- **A display serif with a true italic** — Playfair Display, added as
  `--font-display` / `font-display`, **ADR-006**. Headings pair roman with
  italic inside one line ("Redefining distressed / _property investment_",
  "Latest _properties_"). Marketing only; all product UI stays on Inter.
- Small-caps eyebrows per section, oversized italic figures in `<HeroStats>`,
  staggered mosaics, pill controls throughout.

**New components** (`src/components/marketing/`): `<HeroSearchBar>` (a plain
`method="get"` form on the marketplace's own URL contract — zero client JS, and
a submit lands on a real shareable search), `<CategoryTiles>` (four
distress-category tiles, each a live pre-filtered search with its own count),
`<EditorialListingCard>` (the landing page's presentation of the same
`SearchResultItem` the marketplace card renders — see ARCHITECTURE.md for why
this is a second component rather than a `variant` prop).

**Deviation from the reference**, recorded in ARCHITECTURE.md: the hero plate
carries a gradient rather than a photograph until real listing photography
exists. (A second deviation was recorded here — not reproducing the reference's
floating nav pill — and was reversed on 2026-08-26; see the sixth pass below.)

**Tests.** `tests/e2e/landing.spec.ts` now also drives the hero search bar —
fill location, pick a price cap, submit, assert the resulting `/marketplace?q=…
&maxPrice=…` URL and that the marketplace renders it. Full suite: 466 unit +
integration, **43 Playwright**, all green; `npm run build` clean.

**Gotcha worth remembering:** adding a `@theme` token did not reach the running
dev server — Turbopack's Tailwind cache served CSS without the new
`font-display` utility until restart, while `npm run build` had it immediately.
Restart `npm run dev` after editing `@theme`.

### Third pass — category tile photography (2026-08-26)

Requested directly: the four "By distress type" tiles were gradient-only, which
read as unfinished cards. First attempt was purpose-drawn line art per category;
the product owner asked for real photography instead, so the sketch component
was dropped and replaced with photographs blended into the plate.

**The blend.** `mix-blend-luminosity` on the `<img>` keeps only the photo's light
and shade and takes its colour from the navy beneath, so four unrelated stock
shots come out as one duotone family in the brand palette. The radial wash then
sits _above_ the photo — the accent bloom lights its lower corner the way it
lights an empty tile — and a `from-primary` scrim over the bottom three-fifths
guarantees the label's contrast regardless of what the photo does there. Photo
opacity lifts 45% → 65% on hover, in step with the existing wash hover.

**The assets.** `public/marketing/categories/{probate,fire-flood,structural,
refurb}.jpg` — 600×750, JPEG q66, 58–92 KB each. All four are **CC0 /
public-domain** (free commercially, no attribution required), sourced through
the Openverse API filtered to `license=cc0,pdm`, with per-file provenance in
`public/marketing/categories/LICENSES.md`.

**Decisions.**

- _Committed, not hot-linked_ — same reasoning as `prisma/seed.ts`'s local
  plates: dev and the E2E suite run offline, and a remote 404 is a Lighthouse
  best-practices failure. No runtime network dependency was added.
- _Not the seeded plates_ — `public/uploads/seed/plate-*.svg` is six copies of
  one elevation with "PropLink UK — seed placeholder" baked in; on these tiles
  that would have been four indistinguishable cards showing placeholder text.
- _Placeholder, and labelled as such._ These are stock stand-ins, not PropLink
  listing photography. The fire & flood and structural shots are approximations
  of their categories — `LICENSES.md` says so, and says to swap them when real
  photography exists.
- `CategoryTile` gains `image: string` (the previous line-art attempt's `art`
  key is gone with it). `alt=""` — the tile's label carries the meaning — with
  intrinsic `width`/`height` declared so the tiles stay out of CLS.

**Tests.** No new spec — the images are decorative with no text or behaviour to
assert. 466 unit + integration green; `landing.spec.ts` and `week2-admin.spec.ts`
green at 1512 and 390 px; typecheck, lint and format clean.

### Fourth pass — portal glyphs (2026-08-26)

Requested directly: the "Five portals, shared data" list was hairline-plus-text
with nothing to distinguish one portal from another at a glance.

Five inline-SVG glyphs, on the same terms as `<HeroSearchBar>`'s field icons —
24×24, `fill="none"`, 1.6 stroke, round joins — carried as `d` strings on the
existing `PORTALS` array and rendered by a local `<PortalIcon>` into a `bg-pale`
disc (one step darker than the page's `surface`), inverting to navy on hover.

| Portal              | Glyph                         |
| ------------------- | ----------------------------- |
| Marketplace         | House inside a magnifier      |
| Investor Portal     | Pie with one slice pulled out |
| Agent Portal        | Verification seal with a tick |
| Market Intelligence | Bar chart on a baseline       |
| Ecosystem           | Hub with three linked nodes   |

**Two glyphs needed a second pass**, both found by rendering at size rather than
reading the path data — now recorded as a convention in ARCHITECTURE.md
§ Design system:

- Investor's first draft was a circle with two radii, which reads as a **clock
  face**. Redrawn as an exploded pie.
- Marketplace's first draft put a bare roof chevron in the lens, which reads as
  a **zoom-in caret**. The roof needed its walls.

**Placement.** The glyph sits _inside_ the `<dt>`, not as a sibling: a `<dl>`'s
`<div>` wrapper may only contain `dt`/`dd`, so an icon `<span>` beside them
would be invalid. `aria-hidden` — the portal name is the accessible label.

**Tests.** No new spec — the glyphs are decorative. `landing.spec.ts` and
`week2-admin.spec.ts` green at 1512 and 390 px; typecheck, lint and format clean.

### Fifth pass — retargeted damage photography (2026-08-26)

Requested directly: the fire & flood tile showed a rubble pile (reads as
demolition) and the structural tile an ivy-covered wall (reads as overgrowth).
Both replaced with photographs of the actual defect.

- `fire-flood.jpg` — a gutted roof: charred rafters exposed, burnt-out dormer,
  scorched render. Cropped to exclude the undamaged neighbouring building.
- `structural.jpg` — a diagonal crack running down through brickwork. Cropped
  above the shopfront, which removes the signage and leaves the defect as the
  whole subject.

**Licence change, and the footer that follows from it.** Both new files are
**CC BY 2.0**, not CC0 — the CC0 pool has essentially no usable modern UK fire,
flood or subsidence photography (it returns 1890s archive material). CC BY needs
visible credit wherever the work is shown, so `SiteFooter` gains one small line
naming the two photographers and linking the licence. That line is global rather
than landing-scoped because the footer is. **If either file is replaced, the
footer credit must be edited in the same change** — noted in `LICENSES.md` and
in ARCHITECTURE.md § Third-party imagery, which now also records that CC BY-SA
stays banned: cropping and recolouring makes an adaptation, and share-alike
would then reach our own work.

`probate.jpg` and `refurb.jpg` are unchanged and still CC0.

**Tests.** `landing.spec.ts` and `week2-admin.spec.ts` green; 466 unit +
integration green; typecheck, lint and format clean.

### Sixth pass — floating pill header (2026-08-26)

Requested directly, against a supplied reference (a floating dark nav pill with
links left, wordmark centred, auth right): restyle `SiteHeader` to match, and
give it **the same width as the hero section**.

This **reverses the Sprint-3 deviation** that declined to reproduce the
reference's floating pill. The original objection was that a landing-only nav
duplicate would be a second source of truth — that objection does not apply
here, because the pill _is_ `SiteHeader`, still the one role-aware chrome on
every route. ARCHITECTURE.md's deviation list is updated to match.

**Width.** The header wrapper takes the hero section's own gutters,
`px-3 pt-3 sm:px-5 sm:pt-5`, so bar and plate are the same width by
construction rather than by a matching magic number.

**Layout.** `lg:grid lg:grid-cols-[1fr_auto_1fr]`, not `justify-between` —
the latter centres the middle child in the _leftover_ space, so the wordmark
drifts whenever the flanks differ in width, which they always do here (the link
list is role-dependent, the account side changes on sign-in). Below `lg` the
links drop and the bar is wordmark-left / account-right, as before.

**Two consequences of a navy bar**, both now in ARCHITECTURE.md § Design system:

- `KycPill` gains `tone="dark"`. Its light tints (`bg-success/15` + dark ink)
  invert into muddy near-black on navy with unreadable ink; the dark tone goes
  solid instead — status colour as the fill, white ink (success 7.0, warning
  5.4, danger 6.2, not-started `bg-white/15` at 12.6).
- The wordmark goes monochrome. `text-accent` was 4.8:1 on the old white header
  but is **3.3:1 on navy**, and an automated contrast audit has no logotype
  exemption, so the two-tone mark is carried by weight (`PropLink` bold, `UK`
  regular) and the accent stays in the bar as the "Get started" fill. This also
  matches the reference, whose wordmark is plain white.

**Wrapper is `bg-surface`, not transparent** — the landing `<main>` is surface
too, so the gutter around the pill runs seamlessly into the gutter around the
hero plate instead of banding white against it. On white-`<main>` routes
(`/marketplace`, `/agents/[id]`) it reads as a soft chrome band.

**Not built:** the reference's mega-menu panel (the large white dropdown of
cards below the bar). That is a navigation _content_ model, not a restyle — it
needs per-portal blurbs and imagery that later sprints own. Say the word and it
is a separate piece of work.

**Tests.** Full Playwright suite green — **43/43**, including the signed-in
header specs (`week2-auth`: KYC pill visible, Sign out present) across all four
roles. 466 unit + integration green; typecheck, lint and format clean.

### Seventh pass — shared plate wash on the header (2026-08-26)

Requested directly: give the header pill the hero section's gradient.

The three-radial wash moved out of `page.tsx`'s inline style into **`PLATE_WASH`
(`src/lib/plateWash.ts`)**, imported by both the hero plate and the header, so
the two navy surfaces are one material and cannot drift apart.

**It is a TS constant, not a `.plate-wash` class in `globals.css`.** The class
version was written first and both surfaces rendered _flat navy_ — Turbopack's
Tailwind cache had not picked the rule up, and `plate-wash` was simply absent
from the served stylesheet. ARCHITECTURE.md's Turbopack note previously covered
only `@theme` tokens; it now covers hand-written classes too, and carries the
one-line `curl | grep` that confirms it in seconds rather than by eye.

**Three adjustments the bloom forced.** The accent radial is centred at
`96% 8%` — on a 4rem-tall bar that puts a solid accent field across the right
end, exactly where the account controls live:

- The header renders the wash at **`opacity-70`**. At full strength `Log in`
  measured 4.3:1; damped it clears AA, and the bar keeps the hero's navy →
  accent travel.
- **`Get started` is now white, not accent.** An accent pill sitting on the
  accent bloom has no edge at all. White also matches the hero's own primary
  CTA, so the two agree.
- The signed-in **user name is `text-white/85`**, not the nav links'
  `text-pale/70`, which falls to 3.7:1 under the bloom. The links sit in the
  dark left third and clear AA unchanged.

**Tests.** Full Playwright suite green — 43/43. 466 unit + integration green;
typecheck, lint and format clean. Checked signed-out, signed-in, mobile and
`/marketplace`.

### Eighth pass — real seed listing photography (2026-08-26)

Requested directly: the landing page's "Latest properties" cards were showing
line-art plates captioned **"Front elevation / PropLink UK — seed placeholder"**
— placeholder text rendering verbatim on a public marketing page.

Fixed at the source rather than on that one section. The plates come from
`prisma/seed.ts`, so they were also on every marketplace card, every
`/marketplace/[id]` gallery and the agent portal; replacing them there fixes all
of it at once.

**The assets.** `public/uploads/seed/plate-01…06.jpg` — front elevation, rear
elevation/garden, kitchen, reception room, bathroom, garden/plot. 1200×900,
JPEG q70, 84–207 KB each; 4:3 crops cleanly both to the landing card's
`aspect-4/5` and to the detail gallery. **All six are CC0 / public domain**, so
unlike `public/marketing/categories/` **none needs a footer credit** — provenance
in `public/uploads/seed/LICENSES.md`. The old `plate-0*.svg` files are deleted.

**A latent bug this exposed.** Every card led with the _same_ photograph. The
cover is `sortOrder: 0`, and `plateUrl(n)` made that plate-01 for every listing
— invisible while the plates were near-identical line art, glaring the moment
they became photographs. Now `plateUrl(listingIndex + n)`, so any six adjacent
listings lead with six different plates.

**Re-seeded** (`npm run db:seed`) — the extension change rewrites stored
`PropertyImage.url` values. The seed is all upserts with deletes scoped to its
own listing ids, so user-created rows were untouched.

**Tests.** `tests/integration/search-service.test.ts` failed on the pinned
`.svg` extension — exactly its job — and is updated to `.jpg`, plus a new
assertion that a page of results carries **more than one distinct cover**, which
is the regression that would otherwise have gone unnoticed. Full suite: 466 unit

- integration green, 43 Playwright green; typecheck, lint and format clean.

### Ninth pass — chrome-free auth routes and a redesigned log-in (2026-08-26)

Requested directly: hide the navbar and footer on log-in and sign-up, then
redesign the log-in page — "modern and attractive".

**`<AuthShell>`** (`src/components/auth/AuthShell.tsx`) — a full-bleed split:
navy brand plate left, form right. The plate is the landing hero's own material
(`PLATE_WASH` at `opacity-75`, plus `plate-01.jpg` at `mix-blend-luminosity`,
the same treatment the category tiles use), so signing in does not feel like
leaving the product. Display-serif headline with the roman/italic pairing, three
proof points, and the wordmark. Below `lg` the plate collapses to a branded
strip — a half-height photograph above a form is decoration competing with the
task.

**Two things the plate has to carry**, because removing the chrome removed them:

- The **wordmark is the only route back to `/`** once the header is gone.
- The **EOI compliance line** lived in `SiteFooter`. It is a regulatory
  statement, not marketing, so the plate restates it.

**`<ChromeGate>`** suppresses `SiteHeader`/`SiteFooter` on the auth paths. The
cookie banner is deliberately **not** gated — consent has to be offered on every
page.

- _Whole group, not just the two named routes._ Password reset and email
  verification are the same flow; chrome that reappears when you click "Forgot
  password?" reads as a bug. All five now share `<AuthShell>`.
- _A client `usePathname` gate, not a `(site)` route group._ The group is the
  more idiomatic answer, but it means moving every non-auth route under
  `src/app/(site)/`, which drags `@/app/agent/actions` — imported by a component
  and a unit test — to `@/app/(site)/agent/actions`. The gate's cost is one
  `auth()` call for a header that is then discarded, on unauthenticated pages
  only. `usePathname` resolves during SSR, so there is no flash of chrome.

**Also fixed while in there:** the log-in page never linked to
`/forgot-password`. The route has existed since Sprint 1 and the only way in was
to know the URL.

**Test-visible contract kept deliberately:** `#email`, `#password`,
`button[type=submit]` and the `<h1>Log in</h1>` all survive the redesign —
`tests/e2e/helpers/login.ts` drives every signed-in spec through them.

**Tests.** 466 unit + integration green, 43 Playwright green (all four
register → verify → login role flows); typecheck, lint and format clean.
Checked log-in, sign-up and forgot-password at 1512 px and 390 px.

---

## Landing-page redesign, second pass — misty photographic hero with a scroll orbit

Second reference from the product owner (a Dribbble motion shot for a fictional
agency, "TerraVest"): a full-bleed photograph of a building rising out of forest
fog, an oversized high-contrast serif headline set in near-black **over** it, a
dark pill CTA, a small stat cluster floating left, the navigation sitting on the
image, and the image's foot dissolving into the section below. Its motion is a
slow camera push-in with the tree layers drifting at different rates. The ask
was that motion made stronger — the hero seen **from several angles** as the
page scrolls — from a single still image.

**Palette (ADR-007).** Three additive marketing-only tokens: `mist #E6EFEE`,
`ink #1B1F1E`, `ember #B4573C`. No existing token changed value, and none of the
three may appear in product UI — the same scoping ADR-006 applied to
`font-display`. The previous pass deliberately took the first reference's
typography and none of its colour; that held for a navy plate and does not hold
for a photograph in fog, where white type vanishes into the sky and navy type
fights a cool green-grey image.

**Chrome (ADR-007).** `<SiteHeader>` is an async server component and the root
layout has no pathname, so it cannot be told which page it is on. `<ChromeGate>`
— already the client boundary that knows the route — now publishes
`data-overlay="true"` on a `display: contents` wrapper carrying `group/chrome`,
and the header responds with `group-data-[overlay=true]/chrome:` utilities: out
of flow, transparent band, `PLATE_WASH` suppressed, pill to translucent navy
glass. **The pill stays navy** rather than going pale with dark text, because
every control inside it is coloured for a dark bar and `<KycPill tone="dark">`
is a _prop_ no CSS variant can flip. Utilities, never a hand-written class —
`plateWash.ts` records why a bespoke rule in `globals.css` goes stale under
Turbopack. The compiled CSS was checked for the selectors.

**Motion (ADR-008).** Hand-rolled; no motion library. `src/lib/scrollOrbit.ts`
is pure and DOM-free — `heroProgress(top, height)` from the element's own rect,
`orbitTransform(progress, damping)` over a three-keyframe track — and
`<HeroStage>` contributes one `rAF`-throttled listener, one style write and an
`IntersectionObserver` that stops the work once the hero leaves. Three
keyframes, not two: yaw in from the left, square-on at the midpoint where the
headline is most readable, out to the right and lifting as the hero goes. Two
keyframes read as one slow skew, which is not "several angles".

- `framer-motion` was rejected as a stack addition bought for one effect on one
  page; `animation-timeline: scroll()` is the eventual answer but Safari does
  not support it, and this is the one route where that matters.
- **Reduced motion attaches no listener at all**, rather than damping — scroll-
  linked scale is the specific vestibular trigger. `data-orbit="static" | "live"`
  on the plane makes that assertable. This sets the repo's convention; there was
  none.
- Below `sm` rotation damps to 40% and the crop biases left: a portrait viewport
  crops a 3:2 source hard toward its centre, putting the building behind the copy.

**Hero content.** `<HeroStage>` takes its overlay as `children`, so it is the
only client component on the page — headline, CTAs, metrics and the search form
all stay server-rendered. New `<HeroFigure>` is the reference's stat cluster on
a mist-glass plate (it sits over the building, where ink-on-brick fails contrast
outright). The reference's three client portraits were **not** reproduced:
pre-launch there are no clients to photograph, and inventing faces on the
landing page of a business whose pitch is disclosed defects is exactly the wrong
first impression. Live listing count instead, no "+" — that is an exact number.

**The photograph.** Raised as H3.3 with a committed SVG placeholder and a
generation brief (`docs/marketing/hero-image-prompt.md`); the product owner
generated it the same day, so the placeholder never shipped and was deleted.
`src/assets/heroimage.jpeg` — a scaffolded Georgian terrace in fog, boarded
windows, broken sash, terracotta door, mass in the left third — imported
statically and rendered through `next/image` (`fill`, `priority`,
`placeholder="blur"`) as the page's LCP element. `/src/assets` rather than
`/public` precisely so the import can carry intrinsic size and the blur.

**The real photograph broke contrast, and the fix is measured, not eyeballed.**
Against the pale placeholder the type was fine; against brick it was not.
Tailwind's two-ended `from-/via-/to-` ramp reaches the type column at only ~23%
opacity, leaving ink on brick at **2.56:1** — a fail at any size. Two changes:
the hero content became a fixed `0.42fr / 0.58fr` grid so the text column starts
past the building rather than wherever the figure left off, and the wash became
`TYPE_SCRIM`, an explicit-stop gradient that holds mist opaque across the whole
type column then falls away over the building, dissolving its right side into
fog as the reference's tower does.

Measured before and after with a Playwright screenshot of the hero with the type
made transparent, sampling every pixel under each text box and computing the
worst-case ratio against ink at its actual alpha:

|                      | before | after       | needs |
| -------------------- | ------ | ----------- | ----- |
| Headline, 1440px     | 2.56:1 | **11.51:1** | 3.0   |
| Lede, 1440px         | 2.59:1 | **6.94:1**  | 4.5   |
| Stat cluster, 1440px | —      | **5.17:1**  | 4.5   |
| Headline, 390px      | —      | **8.81:1**  | 3.0   |
| Lede, 390px          | —      | **4.98:1**  | 4.5   |

Those numbers are a property of _this_ photograph. `hero-image-prompt.md` and
ARCHITECTURE.md both say to re-measure if it is ever replaced.

**Test-visible contract kept deliberately:** the `h1` is uppercased in _CSS_, so
its accessible name stays "Redefining distressed property investment"; the
`hero-stats` testid, `Total Distress Inventory`, `Create an account`,
`Browse distressed listings` and the search `Search` button are all untouched.
The three pre-existing `landing.spec.ts` tests passed without edits.

**Tests.** 482 unit + integration green (16 new, TDD, in
`tests/unit/scroll-orbit.test.ts`), 5 Playwright green on `landing.spec.ts` —
two new: the yaw is asserted at three scroll positions, and reduced motion is
asserted to produce no drift. Typecheck, lint and build clean. Checked at
1440 px and 390 px, and under `prefers-reduced-motion`.

**Pre-existing failure, untouched:** `tests/e2e/week2-auth.spec.ts` expects
`"Email verified ✓"` while `(auth)/verify-email/page.tsx` renders
`title="Email verified"` — a mismatch between two other uncommitted files in
this working tree, unrelated to this work.

---

## Palette retune and a flush header — ink & ember platform-wide

Product owner's call, on seeing the redesigned landing beside the app: the navy
and electric blue go, the landing's palette becomes the platform's, and the
navbar stops being a floating capsule. ADR-009.

**The token change is `globals.css` only** — every component already goes
through tokens. `primary #002147 → #1B1F1E`, `secondary #003580 → #33403C`,
`accent #0066FF → #B4573C`, plus `surface`, `pale`, and — not in the original
brief but necessary — `body`, `muted` and `line`, which were all blue-tinted
greys that read as a different family against a warm ground. The semantic four
(`success`/`warning`/`danger`/`intel`) are deliberately untouched: they exist to
sit outside the brand, and EPC band colours are fixed by convention anyway.

**`mist`/`ink`/`ember` were deleted.** ADR-007 created them as marketing-only
tokens because the landing's palette differed from the platform's. It no longer
does, so all three were exact duplicates of `pale`/`primary`/`accent` — three
pairs of identical values with an unenforceable rule about which to reach for.
The marketing/product split now survives only in **type** (ADR-006).

**Two things the palette change broke, neither of them cosmetic.**

- `Button`'s `primary` variant was `bg-accent`. Terracotta put the main action
  in the same colour family as `danger` — in the `/dev/ui` gallery the two were
  barely distinguishable — and left the app's most important button disagreeing
  with every marketing CTA, all of which are ink. `primary` is now
  `bg-primary hover:bg-accent`; **ember became the response to an action rather
  than the action**, carrying hovers, focus, selection and progress, where it
  never sits beside `danger`. Two one-off ember CTAs were aligned to match.
- The flush header over the hero photograph failed AA. Measured by sampling
  every pixel behind it: wordmark **3.29:1**, nav links **4.18:1**. Note the
  wordmark is `text-lg` bold — 18px, _under_ the 18.66px threshold for WCAG
  "large text" — so 4.5 applies, not 3.0. Fixed with links at `/80` instead of
  `/65` and an `h-28` pale haze that fades out below the bar: **11.89:1** and
  **7.60:1**. The haze is taller than the bar on purpose; a gradient ending at
  the bar's own edge draws a line.

**The header itself**: full-width, `h-16`, no fill, one hairline. Interior pages
get `bg-background/85 backdrop-blur-md`. Sticky was considered and left out — it
changes behaviour on every page and can overlap content the e2e suite clicks.

It shipped as wordmark left / small-caps links centred / ink pill right, and the
product owner then had the **centred links and `Log in` removed** — so the bar is
now wordmark + account controls, and the three-column grid collapsed to a
two-ended flex. Flagged at the time and repeated here: `/agent`, `/investor`,
`/intel`, `/ecosystem` and `/admin` now have no link anywhere in the app, and
`/marketplace` is reachable only from the landing page's own CTAs. No e2e spec
depended on the header links, so nothing broke — but signed-in navigation is
now missing rather than relocated.

**Two things deleted rather than kept.** `<KycPill>`'s `dark` tone existed only
for the navy bar; the bar is light on every page now, so it had no callers and
went rather than staying as an unexercised branch. `PLATE_WASH` lost both of its
original consumers (header pill, hero plate) and now serves `<AuthShell>` alone —
kept as a shared constant because it is still the definition of a PropLink dark
plate, and the next one should match rather than invent a second recipe.

**Verification.** Every token pair measured old-vs-new (table in ADR-009); all
pass, and `text-accent` on `bg-primary` still fails at 3.46:1 exactly as it
failed at 3.32:1 under navy — nothing pairs them. Hero contrast re-measured
after the swap and unchanged. 482 unit green, 42 Playwright green, typecheck,
lint, format and build clean. Checked `/`, `/marketplace` and `/dev/ui` at
1440px, and `/` at 390px.

---

## Hero, fourth pass — an aperture reveal

"The hero section looks ordinary." Fair: a full-bleed photograph with type over
it is the default for the category, and the orbit is only legible if you already
know to look for it. Brief was to survey what current award-winning heroes
actually do and make this one land. ADR-010.

**What the research says.** The consistent 2026 pattern is oversized confident
type plus _one_ restrained reveal — the hero's job is to invite, not entertain,
and the winning approach is intentional rather than loud. The recurring
technique in award galleries: an image that arrives as a framed print and opens,
with type revealed line by line from masks. Sources:
[Paperstreet](https://www.paperstreet.com/blog/top-10-hero-sections/),
[Thrive](https://thrivethemes.com/hero-section-examples/),
[Awwwards](https://www.awwwards.com/inspiration/hero-section-scroll-animation-dstafin).

**What was built.**

- **Aperture.** `clip-path: inset()` from a tall print in the left third
  (`12% 62% 18% 8% round 1.5rem`) to full bleed by scroll progress 0.45 — short
  of the hero's exit, because a frame still opening as the section leaves reads
  as a slow layout. `apertureInset(progress)` is a pure function, TDD'd beside
  `orbitTransform` (6 new tests). Applied to the **perspective container, not
  the plane** — clipping the plane rotates its own frame, and a skewed print
  reads as a bug.
- **Masked entrance.** `data-entered` flips one frame after mount; the four
  headline lines release from `overflow-hidden` masks on stagger, then the plate
  label, lede, CTAs, stat cluster and search bar. Transitions on utilities,
  never `@keyframes` — Turbopack's stale-CSS trap again — which also means
  `motion-reduce:` turns it all off with no second code path.
- **Plate label and index ticker.** `01 —— UK DISTRESSED STOCK`, and a slow
  hairline marquee of distress types along the foot. The ticker is `aria-hidden`
  and **not** links: a moving target is a hostile click, and every term is
  already a real pre-filtered search one section below.

**Two things that needed catching.**

- **The aperture is a wide-screen device.** On a 390px viewport the tall print
  was a 117px sliver behind the type. Below `sm` it is skipped, and the closed
  state had to move from an inline style to a Tailwind utility with a `max-sm:`
  override — because the narrow case must win _before JavaScript runs_ or the
  frame snaps open on first paint.
- **The e2e assertions were too exact.** Asserting `inset(0px)` at exactly
  progress 0.45 fails: a rounded scroll target lands a hair short of the
  boundary, and the browser normalises a fully open inset to `0px` or `0%`
  depending on how it got there. Now asserted past the boundary, against a
  pattern.

**A stale claim corrected while in there.** ADR-008 said Safari does not support
`animation-timeline: scroll()`. That is out of date — it runs in Chrome/Edge
115+, Firefox 132+ and Safari 18+, ~84% of traffic. It stays rejected on the
remaining 16% and on the fact that a JS fallback would be needed anyway, not on
Safari. ADR-008 now says so, with the revisit condition.

**Contrast, re-measured across the whole travel** rather than at one position —
the aperture _improves_ the resting case (14.01:1 headline, up from 11.51) but
the photograph then arrives underneath the type, so `TYPE_SCRIM` stays. Worst
case anywhere in the travel: 11.48:1 headline / 6.91:1 lede at 1440px, 8.63:1
and 5.08:1 at 390px. All pass.

**Tests.** 488 unit + integration green (6 new), 6 Playwright on the landing
page (2 new: the aperture's travel, and that reduced motion opens it outright
rather than animating it). The three pre-existing `landing.spec.ts` tests still
needed no edit — the accessible name survives the line masks.

---

## Hero, fifth pass — laid out to the reference itself

The product owner supplied the reference at full size: the TerraVest shot this
whole redesign began from. Seeing it settles several open questions and closes
one wrong turn. ADR-011 supersedes ADR-010.

**The wrong turn.** ADR-010's aperture, index ticker and plate label were chosen
from a description of what modern heroes do, not from the picture. The reference
has none of them — the photograph is full-bleed from the first frame, and the
headline is one roman weight rather than alternating roman and italic. All of it
removed: `apertureInset` and its 6 unit tests, its e2e test, the ticker,
`--animate-marquee`, the `01 ——` label, and the italic. **Kept:** the scroll
orbit and the masked line entrance — neither shows in a still, and both are what
the _motion_ reference does.

**The composition**, matched section for section: proof cluster far left,
oversized roman headline right of centre, one dark pill beneath it, dark glass
search card bottom-left, closing note bottom-right, photograph behind all of it.

**Three departures, each because the reference cannot be copied honestly.**

- **No avatars.** Pre-launch there are no clients to photograph, and inventing
  faces on the landing page of a business whose pitch is disclosed defects would
  be exactly the wrong first impression.
- **The proof cluster keeps a plate.** The reference's sits on open fog; ours
  sits over the terrace's scaffold, where unaided ink measures 1.0:1.
- **The search card keeps all four fields.** The reference's carries one
  free-text input; shrinking to match would have quietly narrowed what the hero
  can search for. Location gets the reference's treatment — wide input, round
  submit — and the three selects sit beneath it on one row. `landing.spec.ts`
  drives the round button by its `sr-only` name, so it needed no edit.

**`TYPE_SCRIM` was retuned twice, from both ends.** Softening it to show more
photograph took the headline to **4.00:1** — a technical large-text pass that
still read as type on masonry. The previous flat setting held pale fully opaque
across 46% of the width and killed the image's whole right half. Settled at
90 → 84 → 45 → 0%. Every element measured after: headline 8.63:1, CTA 16.65:1,
browse link 9.28:1, proof cluster 4.98:1, closing note 12.00:1, its paragraph
6.34:1 at 1440px; 8.96 / 7.56 / 9.98 / 6.02 at 390px. All pass.

**Two things caught in passing.**

- The composition overflowed `100svh` at 900px — the card and closing note ran
  off the bottom. Headline capped at `5rem`, paddings and card tightened.
- The closing note first read "Buy the defect you understand", which is the
  categories section's own heading further down; the hero repeating it makes the
  page read as though it lost its place. Changed to "Defects on the face of it".

**A measurement trap worth recording.** One contrast run produced impossible
numbers (16.65:1 for the headline, 1.0:1 for everything else). The page was
being served by a `next start` still holding the port from before a rebuild, so
the CSS 404'd and the screenshot was unstyled HTML. Kill the server, confirm the
port is free, and check the stylesheet returns 200 before trusting a measurement.

**Tests.** 482 unit + integration green (back down from 488 — the aperture's 6
went with it), 5 Playwright on the landing page. Typecheck, lint, format and
build clean. Checked at 1440px and 390px.

---

## Hero stripped back to headline and call to action

Straight after the reference layout landed, the product owner had four of its
five elements removed: the proof cluster, the closing note, the
`Browse distressed listings` link and the dark search card. What is left is the
headline and one `Create an account` pill, centred on the photograph. Recorded
as an amendment on ADR-011 rather than a new ADR — same decision, revised.

**Two components were deleted, not unmounted.** `<HeroFigure>` and
`<HeroSearchBar>` had no other callers, so leaving them in the tree would have
been dead code that reads as "temporarily disabled".

**What went with the search card, and is worth restoring alongside it.**
`landing.spec.ts`'s "the hero search bar submits into a real marketplace search"
was the only end-to-end proof that the marketplace's URL contract — `q`,
`maxPrice` in pounds, `beds`, `type` — is wired correctly from a form. The unit
tests still cover `parseSearchParams` and `buildSearchQueryString` as a
round-trip pair, so the contract itself is not unverified; what is gone is the
proof that a real form drives it. If a search entry point returns anywhere,
bring that test back with it.

**Two consequences flagged at the time.**

- **Nothing above the fold routes anywhere but `/register`.** `/marketplace` is
  still reached from the category tiles, the showcase cards, "View all N
  listings" and the closing CTA — all below the fold. With the navbar's links
  also gone, the landing page's first screen now offers exactly one destination.
- **No live data appears above the fold.** The proof cluster was the only place
  the hero showed real inventory; `<HeroStats>` still carries the figures in the
  statement section below.

**Contrast** re-measured at the headline's new vertical position — it moved down
as the composition emptied: 9.11:1 at 1440px, 6.88:1 at 390px, CTA 16.65:1 both.

**Tests.** 482 unit + integration green, 3 Playwright on the landing page (down
from 5 — the search test removed, and the two hero assertions it shared).

---

## Figtree becomes the project's single typeface

Product owner's instruction: Figtree across the whole project, replacing **both**
Inter (product UI) and Playfair Display (marketing display). ADR-012 supersedes
ADR-006.

**One variable family, loaded once.** `--font-sans` and `--font-display` both
resolve to it; `weight` is omitted from the `next/font` call so the full 300–900
axis is available. One font file ships where two used to.

**`--font-display` was kept, not collapsed.** It now holds the same value as
`--font-sans`, which invites deleting it — and ADR-009 did exactly that to the
duplicate colour tokens. The difference: those were three lookalikes with an
unenforceable rule about which to reach for, whereas this marks a role that is
still enforced (display scale, uppercase, semibold). Keeping it means
re-pointing at a real display face later is one line instead of an edit at all
15 headings. Documented as deliberate so the next reader does not "tidy" it.

**The roman/italic device became a weight contrast.** ADR-006's whole argument
was that a synthesised or oblique slant reads as emphasis rather than voice —
which is precisely what Figtree's italic would do at headline size. So the
thirteen `<span className="italic">` emphases are now `font-light` against
`font-semibold` headings: "Buy the _defect_ you understand" still has its two
parts. Same colour, so it works on any ground and moved no contrast measurement.

**Display headings needed an explicit weight.** Playfair carried headline scale
on stroke contrast alone; Figtree at 400 does not. Every `font-display` heading
is now `font-semibold`, and the hero headline tightened from
`tracking-[-0.015em]` to `-0.035em` with `leading-[0.9]` — a geometric sans at
78px needs far more negative tracking than a didone.

**Also removed:** `<Line>`'s `italic` prop, which had no callers even before the
face changed.

**Verification.** Hero contrast re-measured at Figtree's metrics — 9.11:1 at
1440px, 6.88:1 at 390px, CTA 16.65:1 both; unchanged, as expected, since the
colours did not move and only the glyphs did. Checked `/`, `/marketplace` and
`/login` at 1440px. 482 unit + integration green, typecheck, lint, format and
build clean.

---

## Landing rebuilt to a flat-colour reference

New reference from the product owner: a Webflow rebuild of Mollie's Plink. Its
own banner says it is a third-party educational rebuild and that the images,
logos and copy belong to Plink — so **only the structure and design language are
taken**. ADR-014 supersedes ADR-011's composition.

Both open questions were put to the product owner and both took the heavier
option: commission renders rather than improvise, and introduce a saturated
brand colour rather than stay monochrome.

**`--color-brand: #0E4A55` (deep petrol), band ground only** — the hero and the
closing CTA. Measured: white 9.86:1, `pale` 8.43:1, and `accent` **2.05:1**, so
ember on that ground is a fill with white type and never text — the same shape of
constraint `accent` already carries on `primary`.

**Six blocks**, mapped from the reference: `brand` hero with a floating object →
near-black core loop → near-black split (the terrace photograph left, type right)
→ light statement with the live figures → portal index plus a scrolling ecosystem
band → closing CTA back on `brand`.

**The photograph moved rather than went**, and that deleted machinery. The
reference's hero is flat colour, so the terrace relocated to the categories split
where it is the subject. `TYPE_SCRIM` and both fog scrims went with it — they
existed only to keep ink legible over brick, and the headline is now white on a
token whose contrast is fixed by the token.

**Two contrast failures caught by sweeping rather than sampling.** Every text
node on the page — 73 of them — checked for computed colour against resolved
background, alpha composited, at the right threshold for its size. The portal
numerals at `text-primary/35` measured 2.14:1, and the ecosystem band's ember
glyph 4.38:1 on `surface`. Numerals to `/70`, band moved to `background`
(ember reads 4.81:1 there). **Now 0 of 73.** The header also had to invert: its
ink wordmark was **1.73:1** on petrol.

> **The sweep needs one thing to be right.** Tailwind's alpha modifiers compile
> to `color-mix(in oklab, …)`, reported by the browser as `oklab(L a b / alpha)`.
> Parsed as sRGB those components are nonsense and every light-on-dark pair reads
> as ~1.2:1 — the first run reported 39 failures, nearly all of them phantom.
> Convert oklab → sRGB, or the sweep is worse than not running it.

**A mistake worth recording.** A greedy regex used to replace a bullet list in
`docs/ARCHITECTURE.md` matched to end-of-file and deleted ~290 lines — the
marketing component list, the whole Design system section and the decisions log.
Restored from `git show HEAD:` as a base with every sprint change re-applied.
The lesson is narrow and practical: **never anchor a multi-line documentation
edit on an open-ended repetition** (`(?:- \*\*.*\n)+`); anchor on the next
known heading, or replace an exact block.

**Tests.** 482 unit + integration green, 4 Playwright on the landing page.
Typecheck, lint, format and build clean.

---

## Marketplace takes the reference's shell

`/marketplace` is where every landing CTA leads and it was still a plain white
utility page. The product owner asked for the template here too, and chose
**shell only** over a full treatment — which is the right call: the reference is
a marketing language and this is a working tool.

**What changed is the band.** A `primary` masthead running to the top of the
viewport, carrying the eyebrow, display heading and standfirst. `/marketplace`
joined `OVERLAY_ROUTES`, so the header floats on it and inverts to white through
the same mechanism the landing hero uses — no new machinery. The heading takes
the reference's semibold/light pairing at **tool scale**, not the landing's.

**What did not change is everything below it.** Same sidebar width, same card
grid, same gaps. Giant type and deep vertical rhythm would mean fewer results per
screen and slower scanning, which is a straight downgrade on a search page.

**The sweep found a pre-existing legal-ish bug.** All 216 text nodes checked; 7
failures, every one an EPC band letter — **B at 2.72:1 and F at 2.70:1**, white
on their band colours. That predates this work and sits on an element UK law
requires every listing to show. Band colours are conventional and fixed, so the
ink is the only variable: B and F moved to `primary`, which is the trick
`badge.tsx` already documented for C–E. Measured after — A 4.98 and G 4.53 on
white, everything else 6.12–11.71 on ink.

Three pages now sweep clean: `/` (73 nodes), `/marketplace` (216),
`/marketplace/[id]` (25) — **0 failures**.

**Tests.** 482 unit + integration green, 41 Playwright. Typecheck, lint, format
and build clean.

---

## Three role portals, strictly separate

Registration signed a user in and dropped them on the landing page; `/agent`
redirected straight to its listings tab, so the agent portal had no front door;
`/investor` and `/buy` did not exist. Now there are three dashboards, one shell,
and no overlap between the self-serve roles. ADR-016.

**The whole data model already existed** (Sprint 1 built it), so these are real
dashboards over `SyndicatePledge`, `KycRecord`, `SavedProperty`, `Enquiry`,
`Viewing` and `Offer` — not shells.

**Read-side only, and that was put to the product owner explicitly.** Pledging,
chat, viewing booking, offers and the deal tracker are Sprint 4–5, and every one
is gated on something unbuilt: the KYC service, `SYNDICATE_PAYMENTS_ENABLED`
staying false, FCA counsel sign-off (H4.3). Nothing here writes, so no dashboard
can become a back door into a regulated action.

**Separation is enforced four times over**, because one gate is a single point of
failure: middleware on the JWT at the edge (`/buy` joins `/agent` and
`/investor`); `auth()` again in each page before reading a user's own data; every
service query scoped by `userId`/`agentProfileId` **in the `where`** rather than
filtered after; and a header that offers exactly one signed-in link — the portal
that role owns. `ADMIN` stays in every gate by decision: seed-only, and
moderating a listing means seeing what the role concerned sees.

**`/portal` is a server-side role router.** Both auth screens are client
components holding no role after `signIn(..., { redirect: false })`, so pushing
to `/portal` lets the server resolve it from one shared `PORTAL_HOME` map — the
same map the header link uses, so a role can never be sent somewhere its own gate
will bounce it from.

**Two bugs found on the way, neither cosmetic.**

- **`projectCount` passed for the wrong reason.** It returned `pledges.length`,
  and the test could not tell the difference because the fixture had no project
  identity. An investor topping up the same syndicate twice holds one project,
  not two. Fixture grew a `projectId`, test went red, fixed to count distinct.
- **Two `<h1>`s on `/agent`.** The existing agent layout already carried the
  portal chrome, and my page added a second shell inside it. The fix was
  structural rather than a patch: `<PortalShell>` belongs in the _layout_, which
  also pulled `/agent/listings`, `/agent/leads` and `/agent/profile` into the new
  language for free.

**Also fixed while in there:** login ignored the `callbackUrl` the middleware
sets, so being bounced off a gated route always landed you on `/`. It now honours
it — but **only a same-origin path**, since the parameter is attacker-controllable
and an open redirect is the classic way that goes wrong. And the KYC pill is now
investor-only; it gates syndicate pledges and nothing else, so an agent seeing
"KYC: not started" was noise about a gate that will never apply to them.

**Compliance.** The investor dashboard states the EOI position above its figures
rather than in a footnote, calls its total _committed intent_ rather than a
balance, keeps money in integer pence, and rounds only the quoted equity
percentage.

**Verification.** 491 unit + integration green (9 new, TDD on the portfolio
maths); 48 Playwright green including 7 new in `portals.spec.ts` that assert each
role reaches its own portal and gets a **403 on both others** — asserted on the
response body, because the middleware rewrites rather than redirects and a URL
assertion would pass even with the gate removed. Contrast swept on all three
portals: 26, 18 and 37 nodes, **0 failures**.

> The sweep needs `main` scope on these pages. The header is absolutely
> positioned, so its DOM ancestor is `body` (white) while it visually sits on the
> dark masthead — swept from `body` it reports white-on-white at 1:1 for every
> header item. False positives, but indistinguishable from real ones if you do
> not know to look.

---

## Buyer portal — a marketplace with real write flows

The buyer side is B2C: clients arrive to search, so `/buy` _is_ the search rather
than a dashboard. Built to `docs/CONTEXT.md` and sprint-plan Task 5.7. ADR-017.

**Shipped:** search home reusing `searchService`/`SearchFilters`/`PropertyCard`
with distress filters collapsed; an affordability calculator whose budget feeds
straight into `maxPrice`; saved, enquiries, viewings, offers and messages pages;
viewing requests, offers and buyer↔agent messaging as real write paths with
their own services and thin routes; a deal-stage tracker; and price history on
the listing page.

`SearchFilters` and `SearchPagination` gained a `basePath` prop so `/marketplace`
and `/buy` share one sidebar rather than a fork.

**The write flows are real because none of them is regulated.** The EOI
constraint and the KYC gate cover _syndicate pledges_ — a viewing request or an
offer is an ordinary negotiation with no money crossing the platform. Each route
re-authorises server-side; the buyer comes from the session and never the body.

**Two things could not be built as specified, and both say so in the UI.**

- **Chat persists but does not push.** Pusher is H4.2. Messages, threads and
  unread counts are real; it refreshes on navigation and tells the user that.
- **⚠️ Price history runs on invented data.** Offered the choice between omitting
  the chart and seeding samples, the product owner chose seeding — with the
  caveat, raised at the time, that a fabricated-but-authoritative price chart on
  a property site is the worst kind of placeholder. So it is built to make the
  fabrication unmissable: a warning above the figures, `source: "SAMPLE"` on
  every seeded row, and an e2e test that fails if the warning is removed.

**A real bug fell out of building it.** `SearchFilters` pushed the URL on mount
even when its state already matched `initial`. Under parallel load that spurious
`router.replace` landed _after_ an in-route navigation and wiped the filter it
had just arrived with — the affordability CTA's `?maxPrice=` silently vanished.
Two fixes: push only when the query string actually differs, and adopt an
externally-changed URL **during render** rather than in an effect. The effect
version was tried first and did not work — an effect runs after the debounce has
already captured the stale values, which is the bug, not the fix.

**And a test-hygiene failure worth recording, because it cost real time.** Buyer
write paths mean more tables reference `Property`. `agent-leads-analytics.spec.ts`
deleted only `Enquiry` and `SavedProperty` before its fixture listing, so once my
buyer specs started writing offers and chat messages against _whatever sorted
first_ — which under parallel runs is that spec's own fixture — the delete failed
on a foreign key and left an **imageless orphan**. That orphan then broke
`tests/integration/search-service.test.ts` on every subsequent run, which looked
like an unrelated regression in code I had not touched.

Both ends fixed: the spec's cleanup now covers every referencing table, and buyer
specs pick a **seeded** listing (`seed-listing-*`) rather than the newest card.
The dev database was cleaned of six orphans, and the full suite now leaves
exactly the 40 seed listings behind, verified over consecutive runs.

**Verification.** 504 unit + integration green (13 new, TDD on the affordability
maths); 55 Playwright green including 7 new in `buyer-journey.spec.ts`. Typecheck,
lint, format and build clean. Only the three long-standing `week2-auth` failures
remain.

## Agent is no longer a self-serve role (ADR-018)

The product owner reviewed the `/register` role picker and asked for Agent to
come out: agents will be added manually from the backend.

Removed on **both** sides, because the picker alone is a client-side restriction
on a role boundary and constraint 5 forbids trusting the client for role. The
form now offers Buyer and Investor in a two-up grid, and `SELF_SERVE_ROLES` in
`src/services/users/registration.ts` drops `Role.AGENT`, so a direct
`POST /api/register` with `role: "AGENT"` answers 400 exactly as `ADMIN` already
did.

Tests followed: `registration.test.ts` now asserts both backend-provisioned
roles are rejected, and `week2-auth.spec.ts` runs its register → verify → login
flow over the two public roles.

**Open:** there is no admin UI for creating an agent — `prisma/seed.ts` is the
only route today. Logged in `docs/BLOCKERS.md` pending an admin
user-management screen or an invite-token flow.

## The admin screen that opens an agent account (ADR-019)

ADR-018 left agents with no way in, so the same session built the way in:
`/admin/agents/new`, reached from an "Add agent" button on the Users tab.

**No password is handled by the admin.** The account is created with
`passwordHash: null` and the agent sets their own from an emailed
`AGENT_INVITE` link. That link reuses `/reset-password` — `resetPassword()`
took a `purpose` argument rather than growing a parallel set-password path, so
an invite token and a reset token cannot be spent as each other. The new
purpose needed **no migration**: `VerificationToken.purpose` is a plain
`String` column.

`User` and `AgentProfile` are created in one transaction, because an `AGENT`
with no agency has nothing to list under.

**Driven in the real app, not just asserted.** Admin → add agent → copy the
invite → set a password in a clean browser context → sign in → land on
`/agent` with "Fairweather & Co" as the active profile.

**Two test-hygiene notes.** The e2e server on :3100 runs `npm run start`, a
**production build** — the first spec run failed five ways against a stale
bundle that predated these files, and `npm run build` fixed all five. Worth
remembering: `reuseExistingServer` will happily serve yesterday's app. And
`getByRole("alert")` is ambiguous on any page with the cookie banner, so the
form error carries a `data-testid`.

`auth-pages.spec.ts` still asserted an Agent radio on `/register` from the
earlier ADR-018 change; it now asserts the tile's absence.

**Verification.** 520 unit + integration green (16 new, TDD); 61 Playwright
green including 5 new in `admin-add-agent.spec.ts`. Typecheck, lint, format and
build clean. The three long-standing `week2-auth` `Email verified ✓` failures
are unchanged and reproduce on a clean checkout of `main`.

## The buyer portal redesigned as a consumer surface (ADR-020)

Seen end to end for the first time, `/buy` was a B2B tool wearing a consumer's
job: a black `<PortalShell>` band reading "Find the right defect" over a
five-field affordability form, with **no property visible until you scrolled
past all of it**, `/marketplace`'s 280px filter rail opening on EPC bands and
eight defect chips, and a card ending in "Commute times coming in a later week".

Reference taken from Rightmove/Zoopla, as the product owner asked — that is
what a UK buyer used this week.

**What changed.** `<BuyerShell>` (light chrome, tabs carrying live counts)
replaces `<PortalShell>` on `/buy/*` and `/buy` leaves `OVERLAY_PREFIXES`, so
the header stops inverting. The rail becomes a sticky filter bar of popovers
(`Price · Beds · Property type · EPC · More`) with removable active chips and a
phone sheet. **Results render on arrival**: the affordability calculator moved
inside `Price ▾`, unchanged maths, still writing `maxPrice`. `<PropertyCard>`
gained a photo carousel, a save heart that works from the grid, a plain-English
summary and a `list` variant; the roadmap note is gone. The detail page is two
columns with a sticky action card and a fixed mobile bar.

**The one thing worth copying elsewhere:** the URL-as-state, debounce and
live-count logic moved out of `<SearchFilters>` into `useSearchQuerySync`. There
are now two filter presentations over one behaviour, and copying the logic into
both is how they would have quietly stopped agreeing about what a filter means.

**A second pass on the chrome.** The first version still stacked four
full-width bands above the first property — site header, tinted title band,
filter bar, results toolbar — about 300px before a single house. That is the
affordability form's mistake in a quieter register. The title band lost its tint
and most of its height, sort and the grid/list toggle moved onto the filter row
(they are controls over the same result set, not a separate concern), the count
became a line of text over the grid, and the search input was width-capped so
the row could hold it all. Chrome is now ~185px and two rows of cards are
visible on a 1440×1000 viewport. The search field takes its own line below `sm`,
where sharing one with the sort control squeezed it to the word "Town".

**Two decisions that went against the first instinct.**

- **`reset()` clears the sort too.** It briefly did not — "sort is a preference,
  not a filter" is a fair argument — but "Clear filters" has meant _everything_
  since Task 3.2 and `marketplace-search.spec.ts` asserts the URL returns to a
  bare `/marketplace`. Narrowing an established contract was not this change's
  business, and the failing test was right.
- **The enquiry form stays** alongside the action card's "Message agent" tab.
  They look like duplicates; they are not. The form writes an `Enquiry` row with
  contact details — the agent's leads table — while the tab opens a
  `ChatMessage` thread. Deleting either would have cut a funnel. The headings now
  say which is which.

**No map view.** The reference has one and buyers will expect it, but
`StaticMapService` is still the mock (H3.1/H2.2 browser key). A pinned SVG
behind a "Map" toggle over a result set that pans and filters is worse than no
toggle, so the toggle is Grid/List. Row added to `docs/BLOCKERS.md`.

**Driven in the real app, not just asserted.** Screenshotted at 1440px and
390px: results-on-arrival, the affordability panel inside `Price ▾` with the
grid still visible behind it, list view, the two-column detail page and the
mobile action bar. Two layout bugs only the screenshots showed — a list row
whose photo dictated a 400px height beside an empty text column, and a 16/9
gallery hero that pushed the price and every action below the fold — were fixed
and re-shot.

**Tests.** Two `buyer-journey` specs asserted the old layout (the `<details>`
disclosure, the always-visible calculator) and were rewritten to the new
workflow rather than deleted; three specs added (save-from-grid, view-in-URL,
results-on-arrival). `portals.spec.ts` now reads each portal's nav label from
its role row, since the buyer's nav is deliberately named for what it is. The
save-from-grid spec waits on the `/save` response, not the optimistic flip —
navigating away can abort the in-flight fetch, which is exactly how it first
failed.

**Verification.** 533 unit + integration green (12 new); 61 of 63 Playwright
green. The two red are the long-standing `week2-auth` `Email verified ✓`
failures, confirmed unrelated by stashing this work and reproducing them (3 fail
on the clean tree). Typecheck, lint and format clean.
