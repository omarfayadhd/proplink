# ADR-013 — The portal list becomes a five-row index, and the showcase is removed

**Status:** Accepted · **Date:** 2026-09-04 · **Sprint:** 3

## Context

Two parts of the landing page were raised as weak.

**"Five portals, shared data"** was a `<dl>` in a three-column grid. Five items
in a grid of three leaves a hole in the bottom-right that reads as a missing
sixth portal; the `9rem` eyebrow column wasted a third of the width; and the
small grey glyph discs stacked above their labels made it scan as a spec sheet.

**"Newly listed / Latest properties"** — the three-card showcase — was removed
outright on the product owner's instruction.

## Decision

**The portals become a five-row index on hairlines.** Numbered `01`–`05`, name
and description on one line, full width. An odd count fits rows exactly where it
never fits a grid, and the numerals give the section the same catalogue voice as
the rest of the page. The glyph moves inline beside the name and drops from
`h-10` to `h-9`. The index numeral takes `tabular-nums` so the column stays true
if the list grows.

**The showcase section is deleted**, and with it `<EditorialListingCard>` — its
only caller — plus `SHOWCASE_COUNT` and the `searchService.search` call that fed
it. The page's remaining data fetch is the four category counts.

## Consequences

- **`/marketplace` lost an entry point.** The showcase's cards and its
  "View all N listings" button both linked through. What remains from the
  landing page: the four category tiles, and the closing CTA's `Browse listings`.
- **An e2e test was replaced rather than dropped.** "showcases real listings and
  links through to the marketplace" was the only landing spec that proved a
  click-through into the catalogue. It is now "the category tiles are real
  pre-filtered marketplace searches", which asserts the same thing through the
  route that survived — a tile click landing on `/marketplace?tags=PROBATE`.
- **`Get started` appears twice on the page** — header and closing CTA — so the
  spec asserts it scoped by landmark. An unscoped locator is a strict-mode
  violation, which is a failing test rather than a passing one, but it is worth
  knowing before adding a third.
- `<EditorialListingCard>` was the second presentation of `SearchResultItem`
  that ARCHITECTURE.md described as deliberately _not_ a `variant` prop on
  `PropertyCard`. That reasoning is moot now; `PropertyCard` is the only one.
