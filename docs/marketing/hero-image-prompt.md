# Landing hero photograph — generation brief

**Delivered 2026-09-03** — `src/assets/heroimage.jpeg` (1376 × 768), generated
from the prompt below. This file is kept as the **regeneration brief**: re-roll
from it if the composition ever needs to change, and treat everything under
"What the layout needs" as the constraints any replacement must satisfy.

## What the layout needs

| Requirement     | Value                                                                 |
| --------------- | --------------------------------------------------------------------- |
| Dimensions      | ≥1400 wide; 3:2 or 16:9 both work                                     |
| Format          | `.webp` preferred, `.jpg` fine                                        |
| **Composition** | Building mass in the **left third**; right two thirds open fog        |
| Palette         | Cool desaturated blue-grey; terracotta as the only warmth             |
| Light           | Flat overcast, no sun, no hard shadows                                |
| Subject         | A **distressed** UK property mid-restoration — not a glossy new build |

**The negative space on the right is load-bearing.** The headline is set over
it in near-black `ink`. If the generated image comes out centre-weighted, the
headline loses its ground — regenerate rather than ship it, or the hero's
scrims have to be pushed until the photograph disappears.

The image is also rendered on a plane that rotates up to 14° and scales to
1.14× (ADR-008), so **nothing important may sit within ~10% of any edge**.

## Installing a replacement

Save into `src/assets/` and change the one import at the top of
`src/components/marketing/HeroStage.tsx`. `next/image` reads the intrinsic size
and builds the blur placeholder from the static import, so nothing else needs
touching — **except the crop and the scrim**:

- `object-position` is tuned per breakpoint to the delivered image's framing
  (`20%` below `sm`, `30%` above). A differently-composed image needs both
  re-picked.
- **Two scrims must be re-measured**, because both are tuned to this
  photograph's tonal range:
  - `TYPE_SCRIM` in `<HeroStage>` — the headline is ink on the photograph. The
    delivered image clears AA with room (11.5:1 headline, 6.9:1 lede at 1440px;
    8.8:1 and 5.0:1 at 390px).
  - The **navbar haze** in `<SiteHeader>` — the header sits directly on the
    image on `/`. Without the haze the wordmark measured 3.29:1 over the
    scaffold; with it, 11.9:1.

  Method: screenshot with the type set to `transparent`, sample every pixel
  under each text box, and take the worst-case ratio against the text colour at
  its actual alpha. See ARCHITECTURE.md § Marketing landing page and ADR-009.

## The prompt

```
A misty early-morning British street scene, photographed on an 85mm lens at f/4.
A tall Georgian terraced townhouse in weathered London stock brick rises out of
thick low fog, its upper floors clear and its base dissolving into mist.
The house is mid-restoration: a clean steel scaffold frame wraps the left half
of the facade, pale timber boarding covers two ground-floor windows, one sash
window is missing its glass, and a faded terracotta-red door sits at the top of
worn stone steps. Bare winter plane trees stand in front of and behind it, their
branches fading layer by layer into the fog.
Muted desaturated palette: pale blue-grey mist, cool white sky, soft terracotta
and brick-red as the only warmth. Flat overcast light, no sun, no harsh shadows.
Cinematic architectural photography, fine natural film grain, extremely high
detail on the brickwork and scaffold, shallow atmospheric depth, empty street,
no people, no cars, no text or signage.
Composition: the house occupies the left third of the frame, vertical, with the
right two thirds open to empty fog for text overlay.
```

**Negative prompt**

```
people, cars, text, watermark, logo, signage, HDR, oversaturated, sunny,
blue sky, glass skyscraper, modern high-rise, tilt-shift blur, fisheye,
illustration, 3D render, CGI
```

**Per-tool notes**

- **Midjourney** — append `--ar 3:2 --style raw --stylize 150 --v 7`.
- **Flux / Ideogram / Nano Banana** — paste as-is, set 2400 × 1600.
- If the tool ignores the composition sentence, add "negative space on the right
  half" and regenerate.
