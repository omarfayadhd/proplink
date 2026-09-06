# ADR-009 — Ink & ember replaces navy platform-wide, and the header goes flush

**Status:** Accepted · **Date:** 2026-09-03 · **Sprint:** 3 (landing-page redesign, third pass)
**Supersedes:** ADR-007's marketing-only token split (its overlay-header decision stands)

## Context

ADR-007 added `mist`/`ink`/`ember` for the landing hero and scoped them to
marketing surfaces, exactly as ADR-006 scoped `font-display`. The reasoning was
that the platform's navy identity should not follow a marketing restyle.

Seeing the two side by side, the product owner reversed that: the navy and
electric blue should go, and the landing's palette should become the platform's.
Two consequences follow immediately.

**The marketing-only split loses its reason to exist.** If `primary` _is_ ink,
then `ink` is a duplicate of it, `ember` of `accent`, and `mist` of `pale` —
three pairs of tokens with identical values and a rule nobody can enforce about
which to reach for.

**The floating navy pill loses its material.** `SiteHeader` was a `rounded-full`
navy capsule inset on the hero plate's gutters and carrying `PLATE_WASH`, so bar
and plate read as one object. The hero plate became a photograph (ADR-007), and
a filled capsule now sits against a page whose whole language is hairlines and
open ground.

## Decision

**1. Retune the palette in place.** Every component already goes through tokens,
so this is `globals.css` only:

| Token       | Was       | Now       |                  |
| ----------- | --------- | --------- | ---------------- |
| `primary`   | `#002147` | `#1B1F1E` | near-black ink   |
| `secondary` | `#003580` | `#33403C` | slate green-grey |
| `accent`    | `#0066FF` | `#B4573C` | terracotta ember |
| `surface`   | `#F5F8FF` | `#F2F5F4` | warm off-white   |
| `pale`      | `#EBF2FF` | `#E6EFEE` | mist             |
| `body`      | `#2D3A4A` | `#2F3733` | warm dark grey   |
| `muted`     | `#5A6A7A` | `#5F6B66` |                  |
| `line`      | `#D0DAE6` | `#D5DCD9` |                  |

`body`, `muted` and `line` were not in the original brief for this change, but
all three were blue-tinted greys; left alone they read as a different family
against a warm ground. The semantic tokens — `success`, `warning`, `danger`,
`intel` — are deliberately **untouched**: they exist to stand apart from the
brand, and the EPC band colours are fixed by UK convention regardless.

**2. Delete `mist`, `ink` and `ember`.** The landing swaps onto
`pale`/`primary`/`accent`. ADR-007's overlay-header mechanism is unaffected.

**3. `primary` is the action; `accent` is the response to one.** `Button`'s
`primary` variant was `bg-accent`. With a terracotta accent that put the main
action and `danger` in the same colour family — a hazard, not a taste call — and
left the app's most important button disagreeing with every marketing CTA, all
of which are ink. So `primary` becomes `bg-primary hover:bg-accent`, and ember
carries hovers, focus, selection, and progress, where it never sits beside
`danger`. Two one-off ember CTAs (`/admin` filter, `/403`) were aligned to match.

**4. The header goes flush, then empty.** Full-width, `h-16`, no fill, one
hairline (`border-primary/10`). Interior pages get
`bg-background/85 backdrop-blur-md`; the landing gets no fill and a haze (see
below). `PLATE_WASH` and the capsule are gone from the header — `<AuthShell>` is
now the wash's only consumer.

It first shipped as wordmark left / small-caps links centred / ink pill right.
The product owner then had **the centred links and `Log in` removed**, leaving
wordmark and account controls only, so the three-column grid collapsed to a
two-ended flex. Recorded here rather than quietly, because it has a real cost:
`/agent`, `/investor`, `/intel`, `/ecosystem` and `/admin` now have **no link
anywhere in the app**, and `/marketplace` is reachable only from the landing
page's own CTAs. A signed-in agent gets to their portal by typing the URL.
Restoring signed-in navigation — an account menu or a portal switcher — is
outstanding work, not a decision against it.

**5. `<KycPill>`'s `dark` tone is removed.** It existed solely for the navy bar,
where the light tints inverted into muddy near-black. The bar is light on every
page now, so it had no callers and is deleted rather than kept as an
unexercised branch.

## Contrast

Every pair was measured, not reasoned about. Token pairs, old → new:

| Pair                     | Old   | New   | Need |
| ------------------------ | ----- | ----- | ---- |
| `text-primary` on white  | 16.05 | 16.65 | 4.5  |
| white on `bg-primary`    | 16.05 | 16.65 | 4.5  |
| `text-secondary` on pale | 10.26 | 9.25  | 4.5  |
| `text-accent` on white   | 4.83  | 4.81  | 4.5  |
| white on `bg-accent`     | 4.83  | 4.81  | 4.5  |
| `text-body` on surface   | 10.88 | 11.16 | 4.5  |
| `text-muted` on surface  | 5.23  | 5.06  | 4.5  |

All pass. `text-accent` on `bg-primary` is 3.46:1 (was 3.32:1) and still fails —
as it always did. Nothing pairs them; the old header comment records why, and
that constraint carries over unchanged.

**The header over the photograph needed a fix.** Sampling every pixel behind the
overlay bar (Playwright screenshot, type made transparent) found the wordmark at
**3.29:1** and the nav links at **4.18:1**. Note the wordmark is `text-lg`
bold — 18px, under the 18.66px threshold for WCAG "large text" — so it needs
4.5, not 3.0. Fixed by raising links from `/65` to `/80` and adding an `h-28`
pale haze that fades out below the bar: 11.89:1 and 7.60:1 after. The haze is
taller than the bar on purpose, so it has room to reach zero — a gradient ending
at the bar's own edge draws a line.

## Consequences

- The app is monochrome plus one warm accent. Considerably more restrained than
  navy/electric-blue, and the landing and the product are now one system.
- **The haze is tuned to this photograph.** Replace the hero image and the
  navbar's contrast must be re-measured along with the hero's — both are noted
  in `docs/marketing/hero-image-prompt.md`.
- `intel` (`#0099A8`) is now the only cool hue left in the palette. It survives
  as a 15% tint under dark ink (ADR-002's resolution), which is subtle enough to
  sit in the family, but it is the token to revisit first if the palette ever
  feels inconsistent.
- Header height is unchanged at `h-16`, and it is still **not sticky** —
  considered and left out, because it changes behaviour on every page and can
  overlap content the e2e suite clicks.
