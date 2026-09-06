# ADR-008 — Scroll-driven 3D hero, hand-rolled rather than a motion library

**Status:** Accepted · **Date:** 2026-09-03 · **Sprint:** 3 (landing-page redesign, second pass)

## Context

The reference behind ADR-007 is a 12-second motion shot. Extracting its frames
shows the motion is a slow camera push-in: the building scales up while the tree
layers drift at different rates, with the type held still. The product owner
asked for something stronger — the hero image seen **from several angles** as
the page scrolls, from a single still image.

Nothing in the stack does scroll-linked animation today. There are two ways to
get it.

## Decision

**Hand-roll it.** No new dependency.

- `src/lib/scrollOrbit.ts` — pure, DOM-free maths. `heroProgress(top, height)`
  turns the hero's own `getBoundingClientRect()` into 0–1; `orbitTransform(progress,
damping)` interpolates a three-keyframe track into a CSS `transform` string.
- `src/components/marketing/HeroStage.tsx` — one `rAF`-throttled `scroll`
  listener writing that one string to one element.

**Three keyframes, not two.** The plane yaws in from the left
(`rotateY(-14deg) rotateX(6deg) scale(1.14)`), passes square-on at the midpoint
where the headline is most readable, then swings out to the right and lifts
(`rotateY(12deg) rotateX(-5deg) scale(1.1) translateY(-4%)`). A two-keyframe
track reads as a single slow skew, which is not what "seen from several angles"
looks like.

**`prefers-reduced-motion: reduce` gets no scroll coupling at all** — the plane
is set square-on once and the listener is never attached. Not a damped version:
scroll-linked scale is precisely what provokes vestibular discomfort. The plane
carries `data-orbit="static" | "live"` so this is assertable from an e2e test
rather than only visible by eye.

Below `sm` the rotation is damped to 40% and the crop biases left, because a
yawed plane eats horizontal room and a portrait viewport otherwise crops the
building directly behind the copy.

## Alternatives considered

**A motion library (`framer-motion`, `gsap`).** Rejected. It is a stack addition
— and therefore an ARCHITECTURE.md change — bought for one effect on one page.
`framer-motion` alone is larger than every client component the landing page
currently ships combined, and its `useScroll` would still need the same
keyframe track written by hand.

**CSS `animation-timeline: scroll()`.** Rejected for now, and the reason has
already shifted once — recorded here so the next person does not re-derive it.

This originally said "Safari does not support it". That is **out of date as of
2026**: scroll-driven animations run in Chrome/Edge 115+, Firefox 132+ and
Safari 18+, around 84% of global traffic. It is still not Baseline, because
Firefox arrived late.

It stays rejected on the remaining ~16%, not on Safari. A landing page is the
one route where the widest support matters, and a JS fallback would be needed
anyway — at which point the CSS path is a second implementation of the same
effect rather than a replacement for it. Revisit when this is Baseline: the
whole scroll listener then becomes a `@keyframes` block plus
`animation-timeline: scroll()`, and `scrollOrbit.ts`'s keyframe tracks map onto
it almost directly.

## Consequences

- The interesting half is unit tested (`tests/unit/scroll-orbit.test.ts`, 16
  cases): keyframe interpolation, clamping, damping, and the rounding that keeps
  the transform string stable. A transform written inside a `requestAnimationFrame`
  callback is otherwise only observable by eye.
- `orbitTransform` rounds every channel to three decimals. That is not
  cosmetic — it is what lets `HeroStage` skip the style write when nothing
  visibly moved, since raw interpolation emits values like `1.0700000000000003`
  on every frame.
- An `IntersectionObserver` stops the work once the hero is off-screen, so the
  scroll listener costs nothing for the rest of the page.
- `HeroStage` takes its overlay content as `children`, so the headline, CTAs,
  stat cluster and search form stay server components. It is the only client
  JavaScript the landing page ships.
- This establishes the repo's reduced-motion convention. There was none before.
