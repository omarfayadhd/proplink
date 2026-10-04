"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DistressTag, EpcRating, PropertyType } from "@/generated/prisma/enums";
// Imported from the concrete modules, NOT the `@/services/search` barrel:
// that barrel re-exports `PostgresSearchService`, which imports `@/lib/db`,
// and Prisma cannot be pulled into a client bundle (same trap Task 2.2 hit
// with `formatPenceGBP`). `queryString.ts` is pure and `types.ts` is
// type-only, so both are safe here.
import { buildSearchQueryString } from "@/services/search/queryString";
import type { SearchParams } from "@/services/search/types";

export const MIN_BUDGET = 25_000;
export const MAX_BUDGET = 500_000;
export const BUDGET_STEP = 5_000;

/** How long after the last keystroke/drag before we hit the network. */
const DEBOUNCE_MS = 300;

/**
 * Every filter the search exposes, in the units the *inputs* use — pounds and
 * strings — rather than the pence and enums `SearchParams` carries. The
 * conversion happens in one place (`toParams`), so no control has to remember
 * which side of the boundary it is on.
 */
export interface FilterValues {
  q: string;
  maxPricePounds: number;
  epcBands: string[];
  distressTags: string[];
  propertyType: string;
  minBedrooms: string;
  minRoiPct: string;
  sort: string;
}

function initialValues(initial: SearchParams): FilterValues {
  return {
    q: initial.q ?? "",
    maxPricePounds: initial.maxPriceGBP != null ? initial.maxPriceGBP / 100 : MAX_BUDGET,
    epcBands: initial.epcBands ?? [],
    distressTags: initial.distressTags ?? [],
    propertyType: initial.propertyType ?? "",
    minBedrooms: initial.minBedrooms != null ? String(initial.minBedrooms) : "",
    minRoiPct: initial.minRoiPct != null ? String(initial.minRoiPct) : "",
    sort: initial.sort ?? "newest",
  };
}

const EMPTY: FilterValues = {
  q: "",
  maxPricePounds: MAX_BUDGET,
  epcBands: [],
  distressTags: [],
  propertyType: "",
  minBedrooms: "",
  minRoiPct: "",
  sort: "newest",
};

/**
 * How many filters are *narrowing* the search right now. Sort is excluded — it
 * reorders, it does not filter — and so is a budget parked at the top of the
 * range, which means "no limit" rather than "£500k".
 */
export function countActive(v: FilterValues): number {
  return (
    (v.q.trim() ? 1 : 0) +
    (v.maxPricePounds < MAX_BUDGET ? 1 : 0) +
    v.epcBands.length +
    v.distressTags.length +
    (v.propertyType ? 1 : 0) +
    (v.minBedrooms ? 1 : 0) +
    (v.minRoiPct ? 1 : 0)
  );
}

function toParams(v: FilterValues, initial: SearchParams): SearchParams {
  const params: SearchParams = {};
  if (v.q.trim()) params.q = v.q.trim();
  // At the top of the range the slider means "no upper limit", not "£500k".
  if (v.maxPricePounds < MAX_BUDGET) params.maxPriceGBP = v.maxPricePounds * 100;
  if (v.epcBands.length) params.epcBands = v.epcBands as EpcRating[];
  if (v.distressTags.length) params.distressTags = v.distressTags as DistressTag[];
  if (v.propertyType) params.propertyType = v.propertyType as PropertyType;
  if (v.minBedrooms) params.minBedrooms = Number(v.minBedrooms);
  if (v.minRoiPct) params.minRoiPct = Number(v.minRoiPct);
  if (v.sort !== "newest") params.sort = v.sort as SearchParams["sort"];
  // Filters changing always returns to page 1 — staying on page 7 of a
  // narrower result set would show an empty grid. The map viewport, by
  // contrast, survives a filter change: it is where the user is looking.
  if (initial.bbox) params.bbox = initial.bbox;
  else if (initial.centre) params.centre = initial.centre;
  return params;
}

/**
 * The search's filter state, shared by every filter UI (Task 3.2, ADR-020).
 *
 * **The URL is the state.** Every change rewrites the query string via
 * `router.replace`, and the server component re-renders the results from it —
 * so a search is shareable, the back button works, and there is no second copy
 * of the filter state to drift out of sync. The React state here exists only to
 * keep the inputs responsive between keystroke and debounce.
 *
 * The live count comes from `/api/search/count` rather than from the rendered
 * results, because it has to answer "how many would this find?" while the user
 * is still dragging the budget slider — before the results have been fetched.
 * An incrementing request id guards against a slow early response landing after
 * a fast later one and showing a stale number.
 *
 * It is a hook rather than a component because there are now two filter
 * presentations over one behaviour — the buyer portal's chip bar and the
 * public marketplace's rail (ADR-020). Copying this logic into both is how the
 * two would quietly stop agreeing about what a filter means.
 */
export function useSearchQuerySync({
  initial,
  resultCount,
  basePath,
  extra,
}: {
  initial: SearchParams;
  resultCount: number;
  basePath: string;
  /**
   * Query params this hook does not own but must not destroy — today just
   * `view`, the buyer's grid/list choice. They are appended to every URL it
   * writes, because `buildSearchQueryString` only knows about `SearchParams`
   * and a `router.replace` built from that alone would silently drop them on
   * the next keystroke.
   */
  extra?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<FilterValues>(() => initialValues(initial));

  /**
   * Adopt the URL when it changes underneath us.
   *
   * The URL is the single source of truth for filter state, but the state above
   * is initialised once. An **in-route** navigation — applying a budget from
   * the affordability panel, a shared link followed from the same page —
   * changes `initial` without remounting, so the debounce below would fire with
   * stale state and replace the URL *back*, silently wiping the incoming
   * filter.
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
    setValues(initialValues(initial));
  }

  // Seeded from the server render so the count is correct before any fetch.
  const [liveCount, setLiveCount] = useState<number | null>(resultCount);
  const requestId = useRef(0);

  const set = useCallback(
    <K extends keyof FilterValues>(key: K, value: FilterValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const patch = useCallback((next: Partial<FilterValues>) => {
    setValues((prev) => ({ ...prev, ...next }));
  }, []);

  /**
   * Back to the unfiltered search, sort included.
   *
   * Sort is arguably a preference rather than a filter, and keeping it would be
   * defensible — but "Clear filters" has meant *everything* since Task 3.2, and
   * `marketplace-search.spec.ts` asserts the URL returns to a bare
   * `/marketplace`. Quietly narrowing that is not this change's business.
   */
  const reset = useCallback(() => {
    setValues(EMPTY);
  }, []);

  const params = useMemo(() => toParams(values, initial), [values, initial]);
  const filterQuery = buildSearchQueryString(params);

  /** The filter query plus the params we are merely carrying (`extra`). */
  const extraPairs = Object.entries(extra ?? {}).filter(([, v]) => v);
  const extraQuery = new URLSearchParams(extraPairs as [string, string][]).toString();
  const queryString = [filterQuery, extraQuery].filter(Boolean).join("&");

  useEffect(() => {
    const timer = setTimeout(() => {
      const id = ++requestId.current;
      setLiveCount(null);

      fetch(`/api/search/count?${filterQuery}`)
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
      // Compared on the *filter* query alone: `extra` is carried, not owned, so
      // a page that arrives with `view=list` must not count as a filter change
      // and rewrite its own URL on mount.
      if (filterQuery !== buildSearchQueryString(initial)) {
        router.replace(queryString ? `${basePath}?${queryString}` : basePath, {
          scroll: false,
        });
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [filterQuery, queryString, router, basePath, initial]);

  return {
    values,
    set,
    patch,
    reset,
    liveCount,
    activeCount: countActive(values),
    /** The current search as a query string, for links that must preserve it. */
    filterQuery,
  };
}
