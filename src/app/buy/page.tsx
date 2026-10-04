import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { parseSearchParams, searchService } from "@/services/search";
import { savedPropertyIdsFor } from "@/services/listings/savedProperties";
import { PropertyCard } from "@/components/marketplace/PropertyCard";
import { SearchPagination } from "@/components/marketplace/SearchPagination";
import { SearchControls } from "@/components/buy/SearchControls";
import { BuyerEmpty } from "@/components/buy/BuyerShell";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * The buyer portal's home is a **search**, not a dashboard (ADR-017) — and
 * since ADR-020, a search that shows properties on arrival.
 *
 * It used to open on a five-field affordability form that occupied the entire
 * first screen. That is a finance gate in front of a shop window: a consumer
 * arrives to look at houses, and works out what they can afford once the prices
 * start mattering. The calculator is unchanged and still feeds `maxPrice`
 * straight into the query — it now lives one click inside the `Price` filter.
 *
 * The URL is the single source of truth for filter state, exactly as on
 * `/marketplace` — `<SearchControls>` rewrites it and this component re-renders
 * from it, so there is no second copy to drift. `view` rides along in the same
 * query string, so a shared link opens the way the sender was reading it.
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

  // `view` is not a search parameter — `parseSearchParams` neither knows nor
  // needs to know about it, and anything but "list" is the grid.
  const view = sp.get("view") === "list" ? "list" : "grid";

  const params = parseSearchParams(sp);
  const results = await searchService.search(params);

  // One query for the page's hearts rather than one per card. ADMIN sees the
  // portal but cannot save (the route is BUYER/INVESTOR), so the heart is only
  // offered to the role that can actually use it.
  const canSave = user.role === "BUYER";
  const savedIds = canSave
    ? await savedPropertyIdsFor({
        userId: user.id,
        propertyIds: results.items.map((i) => i.id),
      })
    : new Set<string>();

  return (
    <>
      <SearchControls initial={params} resultCount={results.total} view={view} />

      <section aria-label="Search results" className="mt-4">
        {results.items.length === 0 ? (
          <BuyerEmpty
            title="No homes match that search"
            action={
              <Link
                href="/buy"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent"
              >
                Clear all filters
              </Link>
            }
          >
            Try widening your budget, removing a filter, or searching a nearby city.
          </BuyerEmpty>
        ) : (
          <>
            <div
              data-testid="results-grid"
              className={
                view === "list"
                  ? "flex flex-col gap-5"
                  : "grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
              }
            >
              {results.items.map((listing) => (
                <PropertyCard
                  key={listing.id}
                  listing={listing}
                  variant={view}
                  saveable={canSave}
                  initialSaved={savedIds.has(listing.id)}
                />
              ))}
            </div>

            <SearchPagination
              params={params}
              page={results.page}
              totalPages={results.totalPages}
              basePath="/buy"
              extra={{ view: view === "list" ? "list" : undefined }}
            />
          </>
        )}
      </section>
    </>
  );
}
