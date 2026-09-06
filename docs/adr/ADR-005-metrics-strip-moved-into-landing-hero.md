# ADR-005 — Global metrics strip moved into the landing hero, zero values omitted

**Status:** Accepted · **Date:** 2026-08-25 · **Sprint:** 3 (landing-page redesign)

## Context

Task 1.5 built the sprint plan's global metrics strip — Total Distress Inventory ·
Completed Syndicate Deals · Accrued Success Fees · Vetted Referrals Routed — as a
full-width navy band mounted in the root layout **above** `SiteHeader`, so it
appeared on every route.

Two problems showed up once the marketplace had real seeded stock:

1. **Three of the four metrics are structurally zero pre-launch.** No syndicate
   has completed, so no success fee has accrued, and the ecosystem directory is a
   later sprint. The first thing every visitor read was
   `0 Completed Syndicate Deals · £0 Accrued Success Fees · 0 Vetted Referrals
Routed`. A strip whose purpose is credibility was costing it.
2. **It pushed the brand below the fold of attention.** A dark data band above
   the header meant the product's own nav was the second thing on the page, and
   the band repeated on every route including ones with their own headline
   figures.

## Decision

- Remove `MetricsStrip` from the root layout. It is not deleted — it stays in
  `src/components/layout/` for the signed-in portal shells, where a persistent
  four-metric strip earns its space and every metric eventually has a value.
- Render the same server-computed metrics in the marketing landing hero via
  `<HeroStats>` (`src/components/marketing/HeroStats.tsx`), **omitting any metric
  whose value is zero**. Omitted metrics reappear on their own the moment they
  have a value, so nothing needs changing at launch.
- Supplement them with two live-supply figures — live listing count and mean
  target ROI — from `getLandingStats()`, so the hero has three real numbers today
  rather than one. These sit in a separate `LandingStats` type: `GlobalMetrics` is
  the plan's fixed four-metric contract and widening it would change what every
  consumer of the strip means by it.
- Abbreviate hero-sized money (`formatCompactPenceGBP`: `£5.87M`, `£412k`), with
  the full figure on the element's `title`. A nine-figure inventory sum rendered
  in full at hero type size wraps and stops being readable.

## Consequences

- The four plan metrics are still server-computed and still cached 60s; only
  where and when they render changed. The Week-2 acceptance check ("metrics strip
  shows seeded values", `tests/e2e/week2-admin.spec.ts`) now asserts against the
  hero stats and no longer pins the count at four.
- `tests/e2e/landing.spec.ts` asserts the inverse of the old behaviour: that no
  zero-valued metric reaches the page.
- Any future page wanting the persistent strip mounts `<MetricsStrip>` itself.
- A metric that legitimately _is_ zero after launch (a quiet quarter) will
  disappear rather than read `0`. Accepted: for these four cumulative
  lifetime totals, zero only ever means "not yet".
