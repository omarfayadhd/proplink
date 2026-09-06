# Category tile photography — provenance

These four images back the "By distress type" tiles on `/` (`<CategoryTiles>`).
They are **placeholder stock, not PropLink listing photography** — swap them for
real photography when it exists.

## Licences

Two files are CC0 / public domain (no conditions). **Two are CC BY 2.0, which
requires visible credit wherever the work is shown** — that credit is in
`SiteFooter`, so it appears on every page. If either CC BY file is removed or
replaced, remove its name from the footer in the same change.

No CC BY-**SA** assets: cropping and recolouring an image creates an adaptation,
which share-alike would then oblige us to license SA in turn.

| File             | Licence   | Credit required | Source                                                                                                             |
| ---------------- | --------- | --------------- | ------------------------------------------------------------------------------------------------------------------ |
| `probate.jpg`    | CC0       | —               | [4–32 Lauriston Road, Preston, Brighton (November 2015)](https://commons.wikimedia.org/w/index.php?curid=45632334) |
| `fire-flood.jpg` | CC BY 2.0 | Karen Roe       | [The Cupola, Bury St Edmunds 23-06-2012](https://www.flickr.com/photos/28752865@N08/7427013252)                    |
| `structural.jpg` | CC BY 2.0 | Chris_Samuel    | [Perhaps that window wasn't such a great idea..](https://www.flickr.com/photos/94482242@N00/5353875961)            |
| `refurb.jpg`     | CC0       | —               | [Building facade under scaffolding](https://www.rawpixel.com/image/6052150/free-public-domain-cc0-photo)           |

## Why they are committed rather than hot-linked

Same reason `prisma/seed.ts` ships local plates: dev and the E2E suite run
offline, and a remote 404 shows up as a Lighthouse best-practices failure.

## Processing

Each is cropped to 600×750 and re-encoded at JPEG q66–68 — they render at
roughly 270×360 CSS px behind a `mix-blend-luminosity` navy blend, so nothing
finer survives. `fire-flood.jpg` and `structural.jpg` are cropped tight on the
defect itself: the fire crop excludes the neighbouring building, and the
structural crop sits above the shopfront so the frame carries the crack and no
signage.

## Sourcing

Found through the Openverse API (`api.openverse.org/v1/images`), filtered by
licence. The CC0-only pool has almost no usable modern UK fire, flood or
subsidence photography — it returns 1890s archive material — which is why the
two damage tiles are CC BY.
