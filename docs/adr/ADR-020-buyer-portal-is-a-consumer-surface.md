# ADR-020 — The buyer portal is a consumer surface, not a role portal

**Status:** Accepted · **Date:** 2026-09-18 · **Sprint:** 3
**Revises:** [ADR-016](ADR-016-role-portals.md), [ADR-017](ADR-017-buyer-portal.md)

## Context

ADR-016 gave every role one shell: a full-bleed `primary` masthead running to
the top of the viewport, the global header floating inverted on it, a
marketing-scale headline, and a hairline sub-nav. ADR-017 then made the buyer
portal's home a search rather than a dashboard, which was right, and dressed it
in that shell, which was not.

The result, seen end to end for the first time this sprint:

- The buyer's first screen was a black band reading **"Find the right defect"**
  over a five-field affordability form — deposit, income, multiple, rate, term.
  **Not one property was visible until the user scrolled past all of it.** A
  finance questionnaire stood between a consumer and the shop window.
- The filters were `/marketplace`'s left rail, reused verbatim: a 280px column
  opening with EPC bands, eight distress-type chips and a target-ROI field. That
  is the _investor's_ vocabulary presented as the consumer's opening question.
- The result card was a thumbnail, a price, a truncated headline and the line
  "Commute times coming in a later week" — a note to ourselves, on a
  customer-facing card.
- Saving required opening the detail page, so shortlisting six houses cost
  twelve navigations.
- On the detail page, price, save, viewing, offer, message and enquiry were six
  separate blocks stacked down a single narrow column, so deciding to _act_ meant
  scrolling past the description to discover which block did what.

The other three portals are tools, opened by people who work here. The buyer is
a customer, and every UK buyer arrives having used Rightmove or Zoopla that
week. The shell was doing the opposite of its job on the one surface where the
audience is not us.

## Decision

**The buyer portal gets consumer chrome of its own. `<PortalShell>` stays
exactly as it is for agent, investor and admin.**

1. **`<BuyerShell>` replaces `<PortalShell>` on `/buy/*`** — white chrome, a
   modest `h1`, and the buyer's activity as a light tab row carrying live
   counts, so a tab says whether it holds anything before it is clicked.
   `<ChromeGate>` drops `/buy` from `OVERLAY_PREFIXES`, so the global header sits
   above the page in flow instead of floating inverted on a band.
2. **The rail becomes a sticky filter bar** — a location field and
   `Price · Beds · Property type · EPC · More` popovers, with active filters as
   removable chips beneath and a full-screen sheet on phones. Price and beds
   come first; the defect vocabulary stays one click inside `More`, which
   preserves Task 5.7's intent (a consumer should not open on a wall of defect
   chips) by disclosure rather than by a collapsed `<details>`.
   **One row, not three.** Sort and the grid/list toggle live on this row too,
   the title band loses its tint and most of its height, and the count is left
   as a line of text over the grid. The first pass had a header, a tinted title
   band, a filter bar and a toolbar stacked above the first property — roughly
   300px of chrome before a single house, which is the same mistake as the
   affordability form in a quieter register.
3. **Results render on arrival.** The affordability calculator moves inside
   `Price ▾`. Same maths (`@/lib/affordability`, unit-tested), same output into
   the search as `maxPrice` — it is no longer the gate.
4. **`<PropertyCard>` becomes a consumer card** — photo carousel, save heart,
   price first, a plain-English summary ("3 bedroom home"), EPC/ROI/defect chips
   and "Listed 11 days ago". The roadmap note is gone. A `list` variant joins
   the grid one, and the layout choice lives in the URL as `view`.
5. **The detail page is two columns** with a sticky action card — price, key
   facts, save and the three buyer actions in one place — and a fixed bottom bar
   on phones.
6. **One filter behaviour, two presentations.** The URL-as-state, debounce and
   live-count logic moves out of `<SearchFilters>` into `useSearchQuerySync`,
   which both the buyer's bar and the marketplace's rail consume.

## Consequences

- **`/marketplace` keeps its rail** and is unchanged in behaviour. It is the
  public, indexed catalogue, where the full filter vocabulary is the point. It
  still benefits from the shared card and hook.
- **The portals no longer look identical, deliberately.** `portals.spec.ts` now
  takes each portal's navigation label from its role row rather than assuming
  `"Portal"` everywhere. The invariant under test — a portal exposes its own
  pages — is unchanged.
- **`SearchResultItem` gains `imageUrls`** (capped at `CARD_IMAGE_LIMIT`, 8) so
  one query feeds the carousel. The LIMIT sits inside the subquery, so Postgres
  stops reading rows rather than aggregating and discarding. `imageUrl` stays as
  the cover shot, so no existing consumer changed.
- **`PropertyCard` is now a client component.** The carousel and the heart are
  interactive. It still server-renders, so `/marketplace` stays crawlable.
- **Saved becomes a card grid**, via `listSavedForCards` — a shortlist is for
  comparing, and comparing needs the photos side by side.
- **No results map.** The Rightmove reference has one and buyers will expect it,
  but `StaticMapService` is still the mock (blocked on H3.1). A pin-less static
  image behind a "Map" toggle is worse than no toggle, so the toggle is
  Grid/List until the Maps key lands. Recorded in `docs/BLOCKERS.md`.
- **No schema migration.** Everything here is read-side.

## Alternatives considered

- **Keep `<PortalShell>` and restyle the band.** Cheapest, and it keeps one
  shell. Rejected: the band is not the problem by itself — the problem is that
  the whole surface was composed for an operator, and shrinking the masthead
  would have left the finance gate, the rail and the developer-facing card in
  place.
- **Give `/marketplace` the same bar.** Tempting for consistency. Rejected as
  out of scope and probably wrong anyway: the public catalogue's job is
  discovery by anyone including investors, and its rail suits that.
- **Drop the enquiry form now that the action card can message an agent.** They
  look like duplicates but are not: the form writes an `Enquiry` row with
  contact details, which is what reaches the agent's leads table, while the tab
  opens a `ChatMessage` thread. Both are kept, with headings that say which is
  which.
