# Landing section objects — generation brief

The landing page follows a reference whose visual language is **soft 3D objects
on flat colour** (ADR-014). Four are needed. Until they exist, `<RenderObject>`
draws geometric SVG stand-ins from the palette — see the **H3.4** row in
`docs/BLOCKERS.md`.

## What the layout needs

| Requirement | Value                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| Count       | 4 — `gable`, `stack`, `loop`, `signal`                                                                      |
| Dimensions  | 1200 × 1200, square, transparent background (PNG or WebP)                                                   |
| Style       | Soft matte 3D, single soft key light, gentle ambient occlusion. Not glossy, not chrome, no reflections      |
| Palette     | Deep petrol `#0E4A55` bodies with terracotta `#B4573C` accents; mist `#E6EFEE` highlights                   |
| Framing     | Object centred, floating, ~15% margin on every side — it is rotated up to 14° by the scroll orbit (ADR-008) |

**The background must be transparent.** Each object sits on a flat coloured band
that changes between sections; a baked-in background would show as a square.

## The four objects

**`gable` — the hero.** An abstract house: a simple extruded gable form, soft
rounded edges, one face in terracotta and the rest petrol. Reads as a building
without being a literal house icon.

> A soft matte 3D render of an abstract minimal house form — a simple extruded
> gable shape with generously rounded edges, floating against a fully
> transparent background. Deep petrol-teal body with one face in muted
> terracotta. Single soft key light from upper left, gentle ambient occlusion, no
> gloss, no reflections, no texture. Centred, generous margin. Clay-render
> aesthetic, product-illustration quality.

**`stack` — the core loop.** Three or four rounded slabs stacked with a small
offset, the top one lifting away, suggesting a deal moving through stages.

**`loop` — the categories split.** A soft torus, slightly tilted, with one
quadrant in terracotta — the refurbishment cycle.

**`signal` — market intelligence.** Three rounded vertical bars of unequal
height on a small plinth, the tallest in terracotta.

For all four, reuse the `gable` prompt's second paragraph verbatim — the
lighting, background and framing rules are what keep the set consistent.

## Installing them

Save into `src/assets/renders/` and swap the `<RenderObject>` variant from its
SVG branch to an `<Image>`. `next/image` reads the intrinsic size from a static
import. Then move the H3.4 row in `docs/BLOCKERS.md` to § Resolved.

**Re-measure nothing.** These sit on flat token grounds whose contrast is fixed
by the tokens, not by the artwork — unlike the hero photograph, whose scrims are
tuned to the image.
