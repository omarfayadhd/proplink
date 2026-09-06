import type { Metadata } from "next";
import { parseSearchParams, searchService } from "@/services/search";
import { PropertyCard } from "@/components/marketplace/PropertyCard";
import { SearchFilters } from "@/components/marketplace/SearchFilters";
import { SearchPagination } from "@/components/marketplace/SearchPagination";

export const metadata: Metadata = {
  title: "Distressed property marketplace",
  description:
    "Search UK distressed property: probate sales, repossessions, fire and flood damage, subsidence and part-complete refurbishments — with EPC ratings and target ROI on every listing.",
  alternates: { canonical: "/marketplace" },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Public marketplace search (Task 3.2). SSR: the results are rendered on the
 * server from the query string, so a shared or crawled URL returns the actual
 * search rather than an empty shell that fills in on hydration.
 *
 * The URL is the single source of truth for filter state — `<SearchFilters>`
 * rewrites it and this component re-renders from it, so there is no second copy
 * to drift. `parseSearchParams` drops anything malformed, so a mangled link
 * degrades to a broader search rather than an error page.
 */
export default async function MarketplacePage({ searchParams }: PageProps) {
  const raw = await searchParams;

  // `searchParams` arrives as a plain object; the parser's contract is a
  // URLSearchParams, which is also what the API route hands it — one parser,
  // one meaning, both entry points.
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") sp.set(key, value);
    else if (Array.isArray(value) && value[0] != null) sp.set(key, value[0]);
  }

  const params = parseSearchParams(sp);
  const results = await searchService.search(params);

  return (
    <main className="flex flex-1 flex-col">
      {/* Masthead — the reference's dark banded opening, at tool scale rather
          than marketing scale (ADR-015). `<ChromeGate>` lists `/marketplace` as
          an overlay route, so the header floats on this band and inverts to
          white exactly as it does on the landing hero.

          The band is where the template's language lives on this page. Below it
          the layout stays dense and scannable on purpose: giant type and deep
          vertical rhythm would make a search page measurably worse to use. */}
      <section className="bg-primary pt-28 pb-14 sm:pt-32">
        <div className="mx-auto w-full max-w-7xl px-6">
          <p className="text-[11px] tracking-[0.22em] text-pale/60 uppercase">
            The catalogue
          </p>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
            <h1 className="font-display max-w-2xl text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-white">
              Distressed property <span className="font-light">marketplace</span>
            </h1>
            <p className="max-w-sm text-sm leading-relaxed text-pale/75">
              Every listing shows its EPC rating, disclosed defects and the agent&apos;s
              target refurbishment ROI.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-6 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
          <SearchFilters initial={params} resultCount={results.total} />

          <section aria-label="Search results">
            {results.items.length === 0 ? (
              <div
                data-testid="no-results"
                className="rounded-lg border border-dashed border-line bg-surface px-6 py-16 text-center"
              >
                <p className="font-semibold text-primary">
                  No properties match that search
                </p>
                <p className="mt-1 text-sm text-muted">
                  Try widening your budget, clearing a filter, or searching a nearby city.
                </p>
              </div>
            ) : (
              <>
                <div
                  data-testid="results-grid"
                  className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {results.items.map((listing) => (
                    <PropertyCard key={listing.id} listing={listing} />
                  ))}
                </div>

                <SearchPagination
                  params={params}
                  page={results.page}
                  totalPages={results.totalPages}
                />
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
