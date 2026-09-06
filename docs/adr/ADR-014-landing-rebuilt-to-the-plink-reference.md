# ADR-014 — The landing page is rebuilt to a flat-colour reference, and gains a band token

**Status:** Accepted · **Date:** 2026-09-04 · **Sprint:** 3
**Supersedes:** [ADR-011](ADR-011-hero-matched-to-the-reference-composition.md) — its
composition, not its contrast method

## Context

The product owner supplied a new reference: a Webflow rebuild of Mollie's Plink
(`plink-rebuild.webflow.io`). Its own banner states it is an educational rebuild
by a third party and that the images, logos and copy belong to Plink — so
**only its structure and design language are taken**, never its assets or words.

That language is: a full-bleed saturated band with one floating 3D object →
alternating near-black sections with very large centred or left-set type →
a light section with a scrolling band → a closing CTA back on the brand colour.
Much larger type and far more generous vertical rhythm than we had.

Two decisions were put to the product owner and both took the heavier option:
commission renders rather than improvise from what we have, and introduce a
saturated brand colour rather than stay monochrome.

## Decision

**1. A new `--color-brand: #0E4A55` (deep petrol).** Band ground only — the hero
and the closing CTA. It sits with `pale`'s green-grey undertone, is not a return
to the navy ADR-009 left, and makes `accent` read as a warm counterpoint.

Its rules, all measured: white on it **9.86:1**, `pale` **8.43:1**. `accent` on
it is **2.05:1**, so ember on this ground is a _fill_ with white type and never
text — the same shape of constraint as `accent` on `primary` (ADR-009).

**2. Six blocks**, mapped from the reference to what we actually have:

| Reference                              | Here                                                    |
| -------------------------------------- | ------------------------------------------------------- |
| Hero: saturated band + 3D object       | Hero: `brand` band + `gable` object on the scroll orbit |
| Oversized centred type + 4-up features | The core loop's four steps                              |
| Split: object left, big type right     | Categories — the terrace photograph left, type right    |
| Centred type + caption                 | The statement, with the live figures beneath            |
| Light section + scrolling logo band    | The portal index + an ecosystem trades band             |
| CTA back on the brand colour           | Closing CTA + the `loop` object                         |

**3. The photograph moved rather than went.** The reference's hero is flat
colour, so the terrace relocated to the categories split — where it is the
subject rather than a backdrop. That deleted `TYPE_SCRIM` and both fog scrims
outright: they existed only to keep ink legible over brick, and the headline is
now white on a token whose contrast is fixed by the token.

**4. The header inverts on the band.** Its ink wordmark measured **1.73:1** on
petrol. In overlay mode every control now goes white and the pale haze — which
existed for the photograph and read as a grey smear on flat colour — is gone.

**5. `<RenderObject>` ships geometric SVG stand-ins.** The four soft-3D renders
are H3.4, brief at `docs/marketing/section-render-prompts.md`. The stand-ins
carry the **same silhouettes** the brief specifies, so the layout, the orbit's
rotation and the section proportions are tuned against shapes a conforming
render will match.

## Contrast

Swept **every text node on the page** (73 of them) rather than sampling: computed
colour and resolved background per node, alpha composited, against the WCAG
large-text threshold where the type qualifies. Two real failures, both fixed —
the portal numerals at `text-primary/35` (2.14:1) went to `/70`, and the
ecosystem band moved from `surface` to `background` so its ember glyph reads
4.81:1 instead of 4.38:1. **Now 0 failures of 73.**

> The sweeper needs one thing to be correct: Tailwind's alpha modifiers compile
> to `color-mix(in oklab, …)`, which the browser reports as `oklab(L a b /
alpha)`. Parsed as sRGB those components are nonsense and every light-on-dark
> pair reads as ~1.2:1. Convert oklab → sRGB before comparing, or the sweep is
> worse than not running it.

## Consequences

- **This is the fourth palette-adjacent decision in the sprint.** `brand` is
  additive and band-scoped, so no product surface changed and no existing pair
  moved, but the token count is growing and the next reader deserves the map:
  `primary` is ink and the action colour, `accent` is the response to one,
  `brand` is a marketing band ground, and the semantic four stand outside all of it.
- The page is `bg-background` at the root now rather than `bg-surface`; the
  sections carry their own grounds.
- `--animate-marquee` returned for the ecosystem band, declared in `@theme` as an
  `--animate-*` token so Tailwind owns the keyframes.
- ADR-011's composition is fully superseded. Its **method** — measure the ground
  behind every piece of type, and re-measure whenever the ground changes — is
  what carried into this one and should outlive it.
