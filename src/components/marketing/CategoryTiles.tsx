import Link from "next/link";
import { cn } from "@/lib/cn";

export interface CategoryTile {
  label: string;
  /** Live listing count for the tile's filter, from `searchService.count`. */
  count: number;
  /** A real `/marketplace` search — same URL contract as the filter sidebar. */
  href: string;
  /**
   * Committed placeholder photograph for the category, from
   * `public/marketing/categories/` — see that folder's `LICENSES.md`.
   */
  image: string;
}

/**
 * Staggered category mosaic. Each tile is a genuine pre-filtered marketplace
 * search rather than decoration, so the row doubles as the fastest route into
 * the catalogue for someone who knows which kind of distress they buy.
 *
 * Each tile is a photograph blended into the navy rather than laid on top of
 * it: `mix-blend-luminosity` keeps only the photo's light and shade and takes
 * its colour from the plate beneath, so four unrelated stock shots come out as
 * one family in the brand navy. The radial wash then sits *above* the photo, so
 * the accent bloom lights its lower corner the way it lights an empty tile.
 *
 * The photography is committed placeholder stock, not listing photography — the
 * seeded catalogue's plates are six copies of one elevation and would have made
 * four indistinguishable tiles. Provenance and licences:
 * `public/marketing/categories/LICENSES.md`.
 */
export function CategoryTiles({ tiles }: { tiles: CategoryTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
      {tiles.map((tile, i) => (
        <Link
          key={tile.label}
          href={tile.href}
          className={cn(
            "group relative isolate flex flex-col justify-end overflow-hidden rounded-3xl bg-primary p-5 transition-transform duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
            // Alternating heights and offsets — the mosaic's whole effect.
            i % 2 === 0 ? "aspect-3/4" : "aspect-4/5 lg:mt-10",
          )}
        >
          {/* Decorative: the label below carries the meaning, so `alt` is empty.
              Intrinsic size is declared to keep the tile out of CLS. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tile.image}
            alt=""
            width={600}
            height={750}
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-45 mix-blend-luminosity transition-opacity duration-300 group-hover:opacity-65"
          />

          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-80 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              backgroundImage:
                "radial-gradient(20rem 16rem at 20% 0%, var(--color-secondary), transparent 70%), radial-gradient(16rem 12rem at 100% 100%, var(--color-accent), transparent 70%)",
            }}
          />

          {/* Scrim: the photo's own values cannot be relied on for the contrast
              the label needs, so the bottom of every tile resolves to navy. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-3/5 bg-gradient-to-t from-primary via-primary/55 to-transparent"
          />

          <span className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white transition-colors group-hover:bg-white group-hover:text-primary">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M7 17 17 7m0 0H9m8 0v8" />
            </svg>
          </span>

          <span className="font-display font-semibold text-lg text-white">
            {tile.label}
          </span>
          <span className="mt-1 text-xs tracking-wide text-pale/70 uppercase">
            {tile.count} {tile.count === 1 ? "listing" : "listings"}
          </span>
        </Link>
      ))}
    </div>
  );
}
