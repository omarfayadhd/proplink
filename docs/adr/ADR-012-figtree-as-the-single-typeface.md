# ADR-012 — Figtree is the whole project's typeface

**Status:** Accepted · **Date:** 2026-09-04 · **Sprint:** 3
**Supersedes:** [ADR-006](ADR-006-display-serif-for-marketing-surfaces.md) in full

## Context

Two families shipped: Inter for all product UI and body copy, and Playfair
Display for marketing headlines — the split ADR-006 established, because the
landing page's typographic signature was a roman/italic pairing inside a single
heading ("Latest _properties_"), and Inter has no italic that reads as editorial.

The product owner asked for Figtree across the whole project, and confirmed it
replaces **both** faces rather than only the sans.

## Decision

**One variable family, `Figtree`, loaded once.** `--font-sans` and
`--font-display` both resolve to it. `weight` is omitted from the `next/font`
call so the whole 300–900 axis is available.

**`--font-display` survives as a token.** It is the same value as `--font-sans`
now, which invites collapsing them — but unlike the `mist`/`ink`/`ember` colour
duplicates deleted in ADR-009, this marks a real and still-enforced _role_:
marketing headline type, always paired with display scale and case. Keeping it
means re-pointing at a display face later is one line here rather than an edit
at all 15 headings. The duplication is deliberate and documented rather than
accidental.

**The roman/italic device becomes a weight contrast.** ADR-006's whole argument
was that a synthesised or oblique slant reads as emphasis rather than voice —
which is exactly what Figtree's italic would do at headline size. So the
thirteen `<span className="italic">` emphases become `font-light` against
`font-semibold` headings. Same colour, so it works on any ground and changes no
contrast measurement, and weight contrast is what a geometric sans does in place
of a serif's italic.

**Display headings gained an explicit weight.** Playfair at 400 carried headline
scale on stroke contrast alone; Figtree at 400 does not. Every `font-display`
heading is now `font-semibold`, and the hero headline tightened from
`tracking-[-0.015em]` to `-0.035em` with `leading-[0.9]` — a geometric sans at
78px needs far more negative tracking than a didone.

## Consequences

- **One font file ships instead of two.** Both were self-hosted and subset by
  `next/font`, so this is a straight reduction with no third-party request
  either way.
- **The brief's Inter requirement is now fully superseded.** AGENTS.md and
  ARCHITECTURE.md said Inter with Calibri-equivalent fallbacks; that fallback
  stack is kept behind Figtree.
- **The editorial serif character is gone by choice.** The landing page reads as
  a modern geometric sans rather than a luxury-editorial spread. That was the
  explicit instruction, and it is the single largest visual change since the
  palette retune.
- Hero contrast re-measured at Figtree's metrics — headline 9.11:1 at 1440px and
  6.88:1 at 390px, CTA 16.65:1 both. Unchanged, as expected: the colours did not
  move, only the glyphs.
- `<Line>`'s `italic` prop was removed; it had no callers even before the change.
