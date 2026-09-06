import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { parseSearchParams, searchService } from "@/services/search";
import { PropertyCard } from "@/components/marketplace/PropertyCard";
import { SearchFilters } from "@/components/marketplace/SearchFilters";
import { SearchPagination } from "@/components/marketplace/SearchPagination";
import { AffordabilityCalculator } from "@/components/buy/AffordabilityCalculator";
import { PortalEmpty } from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * The buyer portal's home is a **search**, not a dashboard (ADR-017).
 *
 * Buyers are the B2C side: they arrive to look for a house, not to read their
 * own metrics. So this is the marketplace with a buyer's framing — the
 * affordability calculator above it feeding `maxPrice` straight into the query,
 * and the distress filters collapsed (Task 5.7) because a wall of defect chips
 * is the wrong opening question for a consumer.
 *
 * The URL is the single source of truth for filter state, exactly as on
 * `/marketplace` — `<SearchFilters>` rewrites it with `basePath="/buy"` and this
 * component re-renders from it, so there is no second copy to drift.
 */
export default async function BuyerSearchPage({ searchParams }: PageProps) {
  const session = await auth();
  const user = session?.user;
  if (!user) redirect("/login");
  if (!["BUYER", "ADMIN"].includes(user.role)) redirect("/403");

  const raw = await searchParams;
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") sp.set(key, value);
    else if (Array.isArray(value) && value[0] != null) sp.set(key, value[0]);
  }

  const params = parseSearchParams(sp);
  const results = await searchService.search(params);

  return (
    <>
      <AffordabilityCalculator />

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        <SearchFilters
          initial={params}
          resultCount={results.total}
          basePath="/buy"
          collapseDistress
        />

        <section aria-label="Search results">
          {results.items.length === 0 ? (
            <PortalEmpty>
              No properties match that search. Try widening your budget, clearing a
              filter, or searching a nearby city.
            </PortalEmpty>
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
                basePath="/buy"
              />
            </>
          )}
        </section>
      </div>
    </>
  );
}
