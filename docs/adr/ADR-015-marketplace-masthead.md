# ADR-015 — The marketplace gets the reference's shell, not its rhythm

**Status:** Accepted · **Date:** 2026-09-04 · **Sprint:** 3
**Builds on:** [ADR-014](ADR-014-landing-rebuilt-to-the-plink-reference.md)

## Context

With the landing page rebuilt to the Plink reference (ADR-014), `/marketplace` —
where every landing CTA leads — was still a plain white utility page: an `h1` at
`text-2xl`, a filter sidebar and a card grid.

The reference's language is a **marketing** language: full-bleed saturated bands,
very large type, floating objects, generous vertical rhythm. The marketplace is a
**working tool**. Applied literally, that language makes it worse — fewer results
per screen, slower to scan.

The product owner was asked how literally to apply it and chose shell only.

## Decision

**The band carries the language; the tool below is untouched.**

- A `primary` masthead runs to the top of the viewport with the page's eyebrow,
  display heading and standfirst. `/marketplace` joins `OVERLAY_ROUTES` in
  `<ChromeGate>`, so the header floats on that band and inverts to white — the
  same mechanism, unchanged, that the landing hero uses.
- The heading takes the reference's type treatment at **tool scale**:
  `clamp(2rem, 4vw, 3.25rem)`, semibold paired with light, not the landing's
  `5rem`.
- **Below the band, nothing changed.** Same sidebar width, same card grid, same
  gaps. Density is the feature on a search page.

`OVERLAY_ROUTES` matches exactly, so `/marketplace/[id]` is deliberately
excluded — the detail page opens on its gallery and wants the header in flow.

## A pre-existing failure the sweep caught

Sweeping all 216 text nodes on the page turned up 7 failures, all EPC band
letters: **B at 2.72:1 and F at 2.70:1**, white on their band colours. That
predates this change and sits on an element UK law requires every listing to
show.

The band colours are fixed by convention, so the ink is the only variable. Each
band now takes whichever of white or `primary` clears AA, measured:

| A          | B        | C        | D         | E        | F        | G          |
| ---------- | -------- | -------- | --------- | -------- | -------- | ---------- |
| 4.98 white | 6.12 ink | 8.76 ink | 11.71 ink | 8.78 ink | 6.17 ink | 4.53 white |

B and F moved to ink, which is the trick `badge.tsx` already documented for C–E.

## Consequences

- Three pages now sweep clean: `/` (73 nodes), `/marketplace` (216),
  `/marketplace/[id]` (25) — **0 failures**.
- `OVERLAY_ROUTES` has two entries. Anything added to it inherits an inverted
  header and owes its own top padding, since the header no longer reserves space.
- The detail page is still untouched by the reference's language. It is the page
  where an enquiry actually happens, so it is the obvious next candidate.
