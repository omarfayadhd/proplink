"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DistressTag, EpcRating, PropertyType } from "@/generated/prisma/enums";
import { DISTRESS_TAG_OPTIONS } from "@/components/listings/wizardTypes";
// Imported from the concrete modules, NOT the `@/services/search` barrel:
// that barrel re-exports `PostgresSearchService`, which imports `@/lib/db`,
// and Prisma cannot be pulled into a client bundle (same trap Task 2.2 hit
// with `formatPenceGBP`). `queryString.ts` is pure and `types.ts` is
// type-only, so both are safe here.
import { buildSearchQueryString } from "@/services/search/queryString";
import type { SearchParams } from "@/services/search/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select } from "@/components/ui/select";

const MIN_BUDGET = 25_000;
const MAX_BUDGET = 500_000;
const BUDGET_STEP = 5_000;

/** How long after the last keystroke/drag before we hit the network. */
const DEBOUNCE_MS = 300;

const EPC_OPTIONS = Object.values(EpcRating).map((band) => ({
  value: band,
  label: band,
}));

const TYPE_OPTIONS = [
  { value: "", label: "Any type" },
  ...Object.values(PropertyType).map((t) => ({
    value: t,
    label: t.charAt(0) + t.slice(1).toLowerCase(),
  })),
];

const BEDS_OPTIONS = [
  { value: "", label: "Any" },
  ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}+` })),
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price", label: "Price: low to high" },
  { value: "roi", label: "Highest ROI" },
  { value: "relevance", label: "Most relevant" },
];

function poundsLabel(pounds: number) {
  return `£${pounds.toLocaleString("en-GB")}`;
}

/**
 * The shared filter sidebar (Task 3.2), used by `/marketplace` and by the buyer
 * portal's search (ADR-017) — `basePath` is the only difference between them.
 *
 * **The URL is the state.** Every change rewrites the query string via
 * `router.replace`, and the server component re-renders the results from it —
 * so a search is shareable, the back button works, and there is no second copy
 * of the filter state to drift out of sync. Local React state exists only to
 * keep the inputs responsive between keystroke and debounce.
 *
 * The live count comes from `/api/search/count` rather than from the rendered
 * results, because it has to answer "how many would this find?" while the user
 * is still dragging the budget slider — before the results have been fetched.
 * An incrementing request id guards against a slow early response landing after
 * a fast later one and showing a stale number.
 */
export function SearchFilters({
  initial,
  resultCount,
  basePath = "/marketplace",
  collapseDistress = false,
}: {
  initial: SearchParams;
  resultCount: number;
  /**
   * Where the rewritten query string is pushed. `/buy` reuses this sidebar
   * verbatim (ADR-017); hardcoding the path would have meant a second copy.
   */
  basePath?: string;
  /**
   * Starts the distress-type filter closed. The buyer portal does (sprint plan
   * Task 5.7): a B2C buyer searches on price and beds first, and a wall of
   * defect chips is the wrong opening question for them. It is a disclosure, not
   * a removal — the filters are one click away and still in the DOM.
   */
  collapseDistress?: boolean;
}) {
  const router = useRouter();

  const [q, setQ] = useState(initial.q ?? "");
  const [maxPricePounds, setMaxPricePounds] = useState(
    initial.maxPriceGBP != null ? initial.maxPriceGBP / 100 : MAX_BUDGET,
  );
  const [epcBands, setEpcBands] = useState<string[]>(initial.epcBands ?? []);
  const [distressTags, setDistressTags] = useState<string[]>(initial.distressTags ?? []);
  const [propertyType, setPropertyType] = useState(initial.propertyType ?? "");
  const [minBedrooms, setMinBedrooms] = useState(
    initial.minBedrooms != null ? String(initial.minBedrooms) : "",
  );
  const [minRoiPct, setMinRoiPct] = useState(
    initial.minRoiPct != null ? String(initial.minRoiPct) : "",
  );
  const [sort, setSort] = useState<string>(initial.sort ?? "newest");

  /**
   * Adopt the URL when it changes underneath us.
   *
   * The URL is the single source of truth for filter state (Task 3.2), but the
   * state above is initialised once. An **in-route** navigation — the buyer
   * portal's "Show listings up to £X" link, a shared link followed from the same
   * page — changes `initial` without remounting, so the debounce below would
   * fire with stale state and replace the URL *back*, silently wiping the
   * incoming filter.
   *
   * Adjusted during render rather than in an effect on purpose: an effect runs
   * after the debounce effect has already captured the stale values, which is
   * exactly the bug. Re-setting to values that already match is a no-op, so our
   * own pushes cost nothing here.
   */
  const incoming = buildSearchQueryString(initial);
  const [syncedTo, setSyncedTo] = useState(incoming);
  if (incoming !== syncedTo) {
    setSyncedTo(incoming);
    setQ(initial.q ?? "");
    setMaxPricePounds(
      initial.maxPriceGBP != null ? initial.maxPriceGBP / 100 : MAX_BUDGET,
    );
    setEpcBands(initial.epcBands ?? []);
    setDistressTags(initial.distressTags ?? []);
    setPropertyType(initial.propertyType ?? "");
    setMinBedrooms(initial.minBedrooms != null ? String(initial.minBedrooms) : "");
    setMinRoiPct(initial.minRoiPct != null ? String(initial.minRoiPct) : "");
    setSort(initial.sort ?? "newest");
  }

  // Seeded from the server render so the count is correct before any fetch.
  const [liveCount, setLiveCount] = useState<number | null>(resultCount);
  const requestId = useRef(0);

  const currentParams = useCallback((): SearchParams => {
    const params: SearchParams = {};
    if (q.trim()) params.q = q.trim();
    // At the top of the range the slider means "no upper limit", not "£500k".
    if (maxPricePounds < MAX_BUDGET) params.maxPriceGBP = maxPricePounds * 100;
    if (epcBands.length) params.epcBands = epcBands as EpcRating[];
    if (distressTags.length) params.distressTags = distressTags as DistressTag[];
    if (propertyType) params.propertyType = propertyType as PropertyType;
    if (minBedrooms) params.minBedrooms = Number(minBedrooms);
    if (minRoiPct) params.minRoiPct = Number(minRoiPct);
    if (sort !== "newest") params.sort = sort as SearchParams["sort"];
    // Filters changing always returns to page 1 — staying on page 7 of a
    // narrower result set would show an empty grid.
    if (initial.bbox) params.bbox = initial.bbox;
    else if (initial.centre) params.centre = initial.centre;
    return params;
  }, [
    q,
    maxPricePounds,
    epcBands,
    distressTags,
    propertyType,
    minBedrooms,
    minRoiPct,
    sort,
    initial.bbox,
    initial.centre,
  ]);

  useEffect(() => {
    const params = currentParams();
    const qs = buildSearchQueryString(params);

    const timer = setTimeout(() => {
      const id = ++requestId.current;
      setLiveCount(null);

      fetch(`/api/search/count?${qs}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { count: number } | null) => {
          // Ignore a response that a newer request has already superseded.
          if (id === requestId.current) setLiveCount(data?.count ?? 0);
        })
        .catch(() => {
          if (id === requestId.current) setLiveCount(0);
        });

      // Only when it actually differs from the URL. Pushing on mount — when
      // state still equals `initial` — rewrites the URL for no reason, and under
      // load that spurious replace lands *after* an in-route navigation and
      // wipes the filter it just arrived with. Nothing changed, so say nothing.
      if (qs !== buildSearchQueryString(initial)) {
        router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [currentParams, router, basePath, initial]);

  function reset() {
    setQ("");
    setMaxPricePounds(MAX_BUDGET);
    setEpcBands([]);
    setDistressTags([]);
    setPropertyType("");
    setMinBedrooms("");
    setMinRoiPct("");
    setSort("newest");
  }

  return (
    <aside aria-label="Search filters" className="space-y-5">
      <div>
        <Input
          id="search-q"
          label="Search"
          type="search"
          placeholder="probate, Manchester, M14…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <p
        data-testid="result-count"
        aria-live="polite"
        className="rounded-md bg-pale px-3 py-2 text-sm font-semibold text-secondary"
      >
        {liveCount === null
          ? "Counting…"
          : `${liveCount.toLocaleString("en-GB")} ${liveCount === 1 ? "property" : "properties"}`}
      </p>

      <div>
        <label htmlFor="search-budget" className="block text-sm font-medium text-body">
          Max budget:{" "}
          <span data-testid="budget-value" className="font-semibold text-primary">
            {maxPricePounds >= MAX_BUDGET ? "No limit" : poundsLabel(maxPricePounds)}
          </span>
        </label>
        <input
          id="search-budget"
          type="range"
          min={MIN_BUDGET}
          max={MAX_BUDGET}
          step={BUDGET_STEP}
          value={maxPricePounds}
          onChange={(e) => setMaxPricePounds(Number(e.target.value))}
          className="mt-2 w-full accent-accent"
        />
      </div>

      <MultiSelect
        label="EPC rating"
        options={EPC_OPTIONS}
        value={epcBands}
        onChange={setEpcBands}
      />

      {collapseDistress ? (
        <details open={distressTags.length > 0} className="group">
          <summary className="cursor-pointer list-none text-sm font-medium text-body">
            <span className="inline-flex items-center gap-2">
              Distress type
              <span
                aria-hidden
                className="text-xs text-muted transition-transform group-open:rotate-90"
              >
                &#9656;
              </span>
              {distressTags.length > 0 ? (
                <span className="text-xs text-accent">{distressTags.length}</span>
              ) : null}
            </span>
          </summary>
          <div className="mt-3">
            <MultiSelect
              label="Distress type"
              options={DISTRESS_TAG_OPTIONS}
              value={distressTags}
              onChange={setDistressTags}
            />
          </div>
        </details>
      ) : (
        <MultiSelect
          label="Distress type"
          options={DISTRESS_TAG_OPTIONS}
          value={distressTags}
          onChange={setDistressTags}
        />
      )}

      <Select
        id="search-type"
        label="Property type"
        options={TYPE_OPTIONS}
        value={propertyType}
        onChange={(e) => setPropertyType(e.target.value)}
      />

      <Select
        id="search-beds"
        label="Bedrooms"
        options={BEDS_OPTIONS}
        value={minBedrooms}
        onChange={(e) => setMinBedrooms(e.target.value)}
      />

      <Input
        id="search-roi"
        label="Minimum target ROI (%)"
        type="number"
        min={0}
        max={100}
        placeholder="Any"
        value={minRoiPct}
        onChange={(e) => setMinRoiPct(e.target.value)}
      />

      <Select
        id="search-sort"
        label="Sort by"
        options={SORT_OPTIONS}
        value={sort}
        onChange={(e) => setSort(e.target.value)}
      />

      <Button type="button" variant="outline" onClick={reset} className="w-full">
        Clear filters
      </Button>
    </aside>
  );
}
