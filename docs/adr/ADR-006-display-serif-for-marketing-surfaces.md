# ADR-006 — A display serif for marketing surfaces, Inter for product UI

**Status:** Superseded by [ADR-012](ADR-012-figtree-as-the-single-typeface.md) · **Date:** 2026-08-25 · **Sprint:** 3 (landing-page redesign)

> **Superseded 2026-09-04.** Figtree replaced both Inter and Playfair Display
> across the whole project (ADR-012). The roman/italic device this ADR exists to
> justify became a semibold/light weight contrast — for the same reason recorded
> below, that a sans italic reads as emphasis rather than voice. Kept for the
> reasoning about why the split was scoped as tightly as it was.

## Context

The landing page was rebuilt to an editorial/luxury reference (a Dribbble
"Luxury Real Estate Agency" shot the product owner supplied). That style's
defining device is typographic, not chromatic: headings pair a roman serif with
a **true italic** of the same face inside a single line —
"Redefining distressed / _property investment_", "Latest _properties_",
"Five portals, _shared data_".

The brief specifies Inter (with Calibri-equivalent fallbacks) as the brand face.
Inter has no italic companion that reads as editorial — a synthesised or oblique
slant makes the device look like emphasis rather than voice.

## Decision

Add **Playfair Display** (weights 400/500, roman + italic) via `next/font/google`
and expose it as one token, `--font-display` → the `font-display` utility.

**Scope is the point:** `font-display` is for marketing headlines and hero
figures only. Every product surface — the marketplace, the portals, forms,
tables, the wizard — stays on `--font-sans` (Inter). Body copy on the landing
page is also Inter; only display type changes face.

## Consequences

- Two font families ship on the marketing route. `next/font` self-hosts and
  subsets both, so there is no third-party request and no layout shift.
- The brief's Inter requirement is unchanged for the product itself. A future
  designer swapping the display face changes one token.
- `--color-*` tokens are untouched: the reference's warm off-white ground is
  rendered with the existing `surface` (`#F5F8FF`) and the navy/accent pair, so
  the redesign adds no colour to the palette.
- **A `@theme` token addition may not reach a running dev server.** Turbopack's
  Tailwind cache served stale CSS — the new utility was absent until a restart,
  while `npm run build` picked it up immediately. Restart `npm run dev` after
  editing `@theme`; a missing utility there is a cache artefact, not a bug in
  the token.
