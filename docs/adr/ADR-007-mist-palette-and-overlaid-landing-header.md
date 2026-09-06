# ADR-007 — A mist/ink/ember palette for the landing hero, and a header that floats over it

**Status:** Accepted · **Date:** 2026-09-03 · **Sprint:** 3 (landing-page redesign, second pass)

## Context

The product owner supplied a second motion reference (a Dribbble shot for a
fictional agency, "TerraVest"). Its hero is a full-bleed photograph of a tower
block rising out of forest fog, with an oversized high-contrast serif headline
set in near-black **over the photograph**, a dark pill CTA, a small stat cluster
floating to the left, and the navigation sitting on the image rather than above
it. The bottom of the image dissolves into the next section instead of ending at
an edge.

ADR-006 took the previous reference's typography and explicitly took none of its
colour: the landing page rendered the editorial look with the existing navy
plate (`--color-primary` + `PLATE_WASH`). That worked for a navy plate. It does
not work for a photograph in fog:

- White type disappears into the pale sky the fog produces.
- Navy type on `surface` (`#f5f8ff`, a blue-white) fights a photograph whose
  whole tonal range is a cool green-grey.
- The navy header pill, sized and washed to match the navy hero plate, has
  nothing left to match once the plate is a photograph.

## Decision

**1. Three additive marketing-only tokens** in `globals.css`:

| Token           | Value     | Role                                                |
| --------------- | --------- | --------------------------------------------------- |
| `--color-mist`  | `#e6efee` | The fog ground. Hero and the section below share it |
| `--color-ink`   | `#1b1f1e` | Display type and the primary CTA on mist            |
| `--color-ember` | `#b4573c` | The one warm note — hovers, the plate's top wash    |

Additive: no existing token changes value. **Scope is the point, as in ADR-006** —
these are for marketing surfaces only. Every product surface keeps navy.

**2. The header floats over the hero on `/` only.** `<ChromeGate>` is already
the client boundary that knows the route, so it publishes
`data-overlay="true"` on a `display: contents` wrapper carrying `group/chrome`,
and `<SiteHeader>`'s own utilities respond with
`group-data-[overlay=true]/chrome:…`. In overlay mode the header leaves the flow
(`absolute inset-x-0 top-0 z-30`), its outer band goes transparent, its
`PLATE_WASH` is suppressed, and the pill becomes translucent navy glass
(`bg-primary/80 backdrop-blur-md`).

**3. The pill stays navy glass rather than going pale with dark text.** Every
control inside it — the wordmark, the nav links, the sign-out border,
`<KycPill tone="dark">` — is coloured for a dark bar, and `tone` is a **prop**,
which no CSS variant can flip. Glass preserves all of them at unchanged
contrast, and reads as the same family as the reference's dark pill CTA.

## Consequences

- Utilities, never hand-written CSS. `plateWash.ts` records that Turbopack's
  Tailwind cache serves stale CSS for hand-added rules in `globals.css`; a
  bespoke `.chrome-overlay` class would have silently not existed. The compiled
  output was checked for the `group-data-[overlay=true]/chrome` selectors.
- `mist` (`#e6efee`, green-grey) butting against `surface` (`#f5f8ff`,
  blue-white) is a visible seam, so the statement section beneath the hero is a
  `from-mist to-surface` gradient band that spends its own height on the
  handover.
- Adding a route to `OVERLAY_ROUTES` is now the whole cost of giving another
  page a full-bleed header. That page owes its own top padding — the header no
  longer reserves space.
- A new `@theme` token still may not reach a running dev server (ADR-006's
  closing note). Restart `npm run dev` after editing `@theme`.
