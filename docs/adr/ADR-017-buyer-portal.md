# ADR-017 — The buyer portal is a marketplace, and its write flows are real

**Status:** Accepted · **Date:** 2026-09-07 · **Sprint:** 3
**Builds on:** [ADR-016](ADR-016-role-portals.md)

## Context

ADR-016 built `/buy` as a read-side dashboard. The product owner then asked for
the full buyer feature set from `docs/CONTEXT.md` and sprint-plan Task 5.7,
noting the buyer side is **B2C** — clients arrive to _search_, so the portal is
a marketplace, not a dashboard.

Task 5.7 specifies: a search preset with distress filters collapsed, an
affordability calculator, historical price data per postcode, buyer↔agent chat,
viewing booking, digital offers and a deal tracker. The whole data model already
exists (Sprint 1).

## Decision

**The home is the search.** `/buy` reuses `searchService`, `SearchFilters` and
`PropertyCard` — the sidebar and pagination gained a `basePath` prop rather than
being copied. The distress filters start **collapsed** (Task 5.7): a consumer
searches on price and beds first, and a wall of defect chips is the wrong
opening question. It is a disclosure, not a removal.

**The affordability calculator feeds the search.** Pure maths in
`@/lib/affordability` (13 unit tests, TDD), so the numbers a buyer decides on
are tested rather than eyeballed. Its budget becomes `maxPrice` in the query —
the reason it sits on a search page rather than a tools page. It is labelled a
guide, not a mortgage decision, with a route to a real decision in principle.

**The write flows are real**, because none of them is regulated: the EOI
constraint and the KYC gate cover _syndicate pledges_ (CONTEXT §1–2). A buyer
requesting a viewing or offering on a property is an ordinary negotiation and no
money moves through the platform. Three services, three thin routes
(`/api/viewings`, `/api/offers`, `/api/chat`), each re-authorising server-side:
the buyer comes from the session and never the body, both ends of a chat thread
are derived server-side, and one standing viewing/offer per property per buyer.

## Two things the sprint plan asks for that could not be built as specified

**Chat persists but does not push.** Task 5.7 specifies Pusher private channels;
Pusher is H4.2 and unprovisioned. Everything except the live channel is real —
messages persist, both sides see the thread, unread counts are accurate — and it
refreshes on navigation. Adding Pusher later is a subscription on top; the data
model and UI do not change. The UI says so plainly rather than implying live
delivery. Logged in `docs/BLOCKERS.md`.

**⚠️ The price history runs on invented data.** The Land Registry ingest is
Sprint 5 and `ComparableSale` was empty. Offered the choice between omitting the
chart and seeding sample comparables, the product owner chose to seed — with the
caveat, raised at the time, that a price chart on a property site which looks
authoritative but is fabricated is the worst kind of placeholder.

It is therefore built so the fabrication is **impossible to miss**: `isSample`
gates a warning rendered _above_ the figures ("These figures are illustrative and
are not HM Land Registry records"), the seed labels every row `source: "SAMPLE"`
and says so in its console output, and an e2e test asserts the notice. If the
notice is ever removed, that test fails. **Do not cite these numbers.**

## Consequences

- `SearchFilters` and `SearchPagination` are now shared by `/marketplace` and
  `/buy` via `basePath`. One sidebar, two pages, no second copy to drift.
- **A real bug fell out of building this.** The sidebar pushed the URL on mount
  even when its state already matched `initial`. Under load that spurious
  `router.replace` landed _after_ an in-route navigation and wiped the filter it
  had just arrived with — the affordability CTA's `?maxPrice=` vanished. It now
  pushes only when the query string actually differs, and adopts an
  externally-changed URL during render rather than in an effect (an effect runs
  after the debounce has captured the stale values, which is the bug itself).
- Buyer write paths mean more tables reference `Property`. Any spec that creates
  a fixture listing must delete `ChatMessage`, `Viewing`, `Deal`, `Offer`,
  `Enquiry`, `SavedProperty` and `PropertyDistressTag` before the `Property`, or
  the delete fails on a foreign key and leaves an **imageless orphan** that
  breaks `tests/integration/search-service.test.ts` for every later run. That
  happened; `agent-leads-analytics.spec.ts`'s cleanup was extended.
- E2E specs that write against a listing must pick a **seeded** one
  (`seed-listing-*`), never "whatever sorts first" — the newest card is usually
  another spec's fixture, and writing to it is what orphans it.
