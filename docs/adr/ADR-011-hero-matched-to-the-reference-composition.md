# ADR-011 — The hero is laid out to the reference, and the aperture is removed

**Status:** Superseded by [ADR-014](ADR-014-landing-rebuilt-to-the-plink-reference.md) · **Date:** 2026-09-04 · **Sprint:** 3 (landing-page redesign, fifth pass)
**Supersedes:** ADR-010 in full

> **Superseded 2026-09-04.** A new reference replaced this one and the whole
> landing page was rebuilt to it (ADR-014): flat saturated bands with floating
> objects rather than a photographic hero. The photograph moved to the
> categories split. Kept for its **method** — measuring the ground behind every
> piece of type — which carried forward and is still the rule.

## Context

ADR-010 answered "the hero looks ordinary" with an aperture reveal, a masked
entrance, a plate label and an index ticker — a direction chosen from a
description rather than from a picture. The product owner then supplied the
reference itself at full size: the TerraVest shot the whole redesign began from.

Seeing it settles several open questions and closes one wrong turn. The
reference has **no aperture** — the photograph is full-bleed from the first
frame — and no ticker, no index numeral, and a headline set in one roman weight
rather than alternating roman and italic.

## Decision

Lay the hero out to the reference and delete what the reference does not have.

**Removed:** the `clip-path` aperture (and `apertureInset` from
`scrollOrbit.ts`, and its unit tests, and its e2e test), the index ticker (and
`--animate-marquee` from `@theme`), the `01 —— UK DISTRESSED STOCK` plate label,
and the roman/italic alternation in the headline.

**Kept:** the scroll orbit (ADR-008) and the masked line entrance (ADR-010's one
survivor) — neither is visible in a still, and both are what the _motion_
reference does.

**The composition**, matched section for section:

| Reference                                    | Here                                                              |
| -------------------------------------------- | ----------------------------------------------------------------- |
| Avatars + `5K+` / `HAPPY CLIENTS`, far left  | `<HeroFigure>` — live lot count, bold sans, no avatars            |
| Three-line roman headline, right of centre   | Four-line roman headline, `clamp(2.5rem, 5.4vw, 5rem)`            |
| One dark pill beneath it                     | `Create an account`, plus the `Browse` link the e2e spec requires |
| Dark glass card, bottom left                 | `<HeroSearchBar>`, rebuilt as that card                           |
| Next section's copy overlapping bottom right | The hero's own closing note                                       |
| Full-bleed photograph behind all of it       | Same                                                              |

**Three deliberate departures**, each because the reference cannot be copied
honestly:

1. **No avatars.** Pre-launch there are no clients to photograph, and inventing
   faces on the landing page of a business whose pitch is disclosed defects
   would be exactly the wrong first impression.
2. **The proof cluster keeps a plate.** The reference's sits on open fog; ours
   sits over the terrace's scaffold, where unaided ink measures 1.0:1.
3. **The search card keeps all four fields.** The reference's card carries one
   free-text input. Shrinking to match would have quietly narrowed what the hero
   can search for, so Location keeps the reference's treatment — wide input,
   round submit — and the three selects sit beneath it on one compact row.

The closing note is _not_ "Buy the defect you understand": that is the
categories section's heading further down, and the hero repeating it makes the
page read as though it lost its place.

## Contrast

`TYPE_SCRIM` had to be retuned twice, and both ends were measured:

- Softening it to show more photograph took the headline to **4.00:1** — a
  technical large-text pass that still read as type on masonry.
- The previous flat setting held pale fully opaque across 46% of the width and
  killed the photograph's whole right half.

Settled at 90% → 84% → 45% → 0%, which holds the type column and lets the
building keep its edge. Measured after (worst pixel under each box, type set to
`transparent`):

|                   | 1440px | 390px | need |
| ----------------- | ------ | ----- | ---- |
| Headline          | 8.63   | 8.96  | 3.0  |
| CTA pill          | 16.65  | 16.65 | 4.5  |
| Browse link       | 9.28   | 7.56  | 4.5  |
| Proof cluster     | 4.98   | —     | 4.5  |
| Closing note      | 12.00  | 9.98  | 3.0  |
| Closing paragraph | 6.34   | 6.02  | 4.5  |

All pass. **Re-measure if the photograph changes** — this is tuned to it.

## Amendment, 2026-09-04 — the hero is stripped back to headline and CTA

Immediately after the layout above landed, the product owner had four of its
five elements removed: the proof cluster, the closing note, the
`Browse distressed listings` link and the dark search card. What remains is the
headline and one `Create an account` pill, centred on the photograph.

`<HeroFigure>` and `<HeroSearchBar>` had no other callers and were **deleted**
rather than left unmounted. `landing.spec.ts` lost the `hero-search` assertion,
the browse-link assertion and the whole "hero search bar submits into a real
marketplace search" test — that test was the only end-to-end proof that the
marketplace's URL contract (`q`, `maxPrice`, `beds`, `type`) is wired correctly
from a form, so if a search entry point is ever restored, restore that test with
it.

**Consequences worth knowing:**

- **The hero no longer routes anywhere but `/register`.** `/marketplace` is
  still reached from the category tiles, the showcase cards, "View all N
  listings" and the closing CTA — all further down the page — but nothing above
  the fold goes there. Combined with the navbar's links having been removed
  earlier, the landing page's first screen now offers exactly one destination.
- **No live data appears above the fold.** The proof cluster was the only place
  the hero showed real inventory. `<HeroStats>` still carries the figures in the
  statement section below.
- Contrast re-measured at the headline's new vertical position: **9.11:1** at
  1440px, **6.88:1** at 390px, CTA 16.65:1 both. All pass.

## Amendment, 2026-09-04 (second) — the CTA goes, then three quieter things come back

The `Create an account` pill was removed too, leaving the headline entirely
alone — at which point the plate read as unfinished rather than restrained. The
brief was to give it company **without overdoing it**, and explicitly not by
restoring what had been taken out.

What is there now:

- an **eyebrow** (`UK DISTRESSED PROPERTY`) whose hairline _draws itself out_ on
  entry — a `width` transition, so it needs no keyframes and `motion-reduce`
  stops it with the same utility that stops everything else;
- **one line** of copy, not the paragraph that used to sit here;
- a **scroll cue** on the plate's lower edge: a hairline with a short segment
  falling down it, `aria-hidden` because it describes the page's shape rather
  than its content.

`--animate-scroll-hint` is the only real `@keyframes` animation in the project.
It lives inside `@theme` as an `--animate-*` token so Tailwind owns it and emits
it with the utility — never as a bare rule in `globals.css`, which goes stale
under Turbopack's cache.

**Both new small-text elements failed AA on first measurement** — the eyebrow at
`text-primary/60` gave 2.83:1 and the scroll label at `/45` gave 2.68:1 over the
photograph. Small tracked caps get no size exemption. The eyebrow went to full
ink (it still reads as an eyebrow on size and tracking alone; the alpha was
buying nothing the type was not already doing) and the label to `/80`. After:
eyebrow 5.74 / 4.53, headline 9.22 / 6.88, lede 5.74 / 4.82, label 7.46 / 7.14
at 1440px / 390px. All pass.

Registration is now reached only from the header's `Get started` and the page's
closing CTA.

## Consequences

- `scrollOrbit.ts` is back to two functions; the unit suite drops from 22 to 16.
- The hero is `min-h-[100svh]` and its whole composition must fit inside that at
  900px, which is why the headline caps at `5rem` and the card is compact. It
  was overflowing before those were tightened.
- The reference's building is centred with fog on both sides; ours sits at the
  left of its frame, so the right of the plate is emptier than the reference's.
  That is a property of the photograph, not the layout — a centred subject in a
  replacement image would close the gap.
