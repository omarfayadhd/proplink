# ADR-010 — The hero opens from a gallery print, and its type rises from masks

**Status:** Superseded by [ADR-011](ADR-011-hero-matched-to-the-reference-composition.md) · **Date:** 2026-09-03 · **Sprint:** 3 (landing-page redesign, fourth pass)
**Builds on:** ADR-007 (photographic hero), ADR-008 (scroll orbit)

> **Superseded 2026-09-04.** The product owner then supplied the reference
> itself at full size, and it has no aperture, no ticker and no index numeral —
> the direction here was chosen from a description rather than a picture. The
> aperture, ticker and plate label were removed; the masked line entrance
> survived. Kept for the reasoning, and because the contrast method it
> establishes is still the one in use. See ADR-011.

## Context

The hero worked but read as ordinary: a full-bleed photograph with type over it
is the default for the category, and the orbit is only legible if you are
already looking for it. The brief was to survey what current award-winning
hero sections actually do and to make this one land.

The consistent 2026 pattern is **oversized confident type plus one restrained
reveal** — not more motion. Sources agree that the hero's job is to invite
rather than entertain, and that the winning approach is intentional rather than
loud. Award galleries show the same technique repeatedly: an image that arrives
as a framed print and opens, with type revealed line by line from masks.

## Decision

**1. An aperture.** A `clip-path: inset()` that starts as a tall print in the
left third (`inset(12% 62% 18% 8% round 1.5rem)`) and opens to full bleed by
scroll progress **0.45** — well short of the hero's exit, because a frame still
creeping open as the section leaves reads as a slow layout rather than a reveal.
The geometry is a pure function, `apertureInset(progress)`, unit tested beside
`orbitTransform`.

It is applied to the **perspective container, not the plane**. Clipping the
plane would rotate the frame with it, and a skewed print reads as a bug; this
way the window stays axis-aligned while the photograph yaws inside it.

**2. A masked entrance.** `<HeroStage>` flips `data-entered` one frame after
mount. The headline's four lines each sit in an `overflow-hidden` mask,
translated a full line down and released on stagger; the plate label, lede,
CTAs, stat cluster and search bar follow on `delay-*`. Transitions on utilities,
never `@keyframes` — a hand-added rule in `globals.css` goes stale under
Turbopack's Tailwind cache (`plateWash.ts`), and `motion-reduce:` then disables
the whole thing with no second code path.

The masks are why the headline is now split into authored lines. At this size it
should be anyway, and the accessible name is unchanged, so
`tests/e2e/landing.spec.ts` needed no edit.

**3. A plate label and an index ticker.** `01 —— UK DISTRESSED STOCK` above the
headline, and a slow hairline marquee of distress types along the hero's foot.
The ticker is `aria-hidden` and deliberately **not** links: a moving target is a
hostile click, and every one of those terms is already a real pre-filtered
search one section below in `<CategoryTiles>`. Here it is texture.

## The aperture is a wide-screen device

Below `sm` it is skipped entirely — a tall print in a portrait viewport is a
117px sliver behind the type. The closed state is therefore a Tailwind utility
with a `max-sm:[clip-path:inset(0px)]` override rather than an inline style,
because the narrow-viewport case has to win **before JavaScript runs** or the
frame snaps open on first paint. From `sm` the effect writes `style.clipPath`
each frame and an inline style beats both.

## Contrast

The aperture _improves_ the resting case — with the right 62% clipped away the
headline sits on bare ground — but the whole point is that the photograph then
arrives underneath it, so `TYPE_SCRIM` stays. Measured across the travel
(screenshot with the type set to `transparent`, worst-case pixel under each box):

|                  | rest  | mid-open | open  | need |
| ---------------- | ----- | -------- | ----- | ---- |
| Headline, 1440px | 14.01 | 11.48    | 11.62 | 3.0  |
| Lede, 1440px     | 7.83  | 6.91     | 6.91  | 4.5  |
| Headline, 390px  | 8.71  | 8.63     | —     | 3.0  |
| Lede, 390px      | 5.08  | 5.08     | —     | 4.5  |

All pass at every point. Re-measure if the photograph changes.

## Consequences

- `scrollOrbit.ts` now owns two pure functions and the component writes two
  properties per frame instead of one. Both writes are still guarded by string
  comparison against the last value, which the rounding makes effective.
- `--animate-marquee` is the first animation token in `@theme`. It lives there
  rather than as a bare `@keyframes` block so Tailwind owns it and emits it
  alongside the utility; restart `npm run dev` after editing `@theme`.
- Two new e2e tests: the aperture's travel, and that reduced motion opens it
  outright rather than animating it.
- The entrance runs on every mount, including client-side navigations back to
  `/`. That is the intended behaviour for a landing page, but it is worth
  knowing before the hero is reused anywhere a user returns to often.
