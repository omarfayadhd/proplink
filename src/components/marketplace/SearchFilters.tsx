"use client";

import { EpcRating, PropertyType } from "@/generated/prisma/enums";
import { DISTRESS_TAG_OPTIONS } from "@/components/listings/wizardTypes";
import type { SearchParams } from "@/services/search/types";
import {
  BUDGET_STEP,
  MAX_BUDGET,
  MIN_BUDGET,
  useSearchQuerySync,
} from "@/components/marketplace/useSearchQuerySync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select } from "@/components/ui/select";

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
 * The public marketplace's filter rail (Task 3.2).
 *
 * All of its behaviour — URL as state, debounce, live count — is
 * `useSearchQuerySync`, which the buyer portal's chip bar also uses (ADR-020).
 * This file is now only the rail's *presentation*.
 *
 * The rail suits `/marketplace`, which is the public, indexed catalogue where
 * the full filter vocabulary is the point. The buyer portal deliberately
 * presents the same filters differently — see `components/buy/SearchControls`.
 */
export function SearchFilters({
  initial,
  resultCount,
  basePath = "/marketplace",
}: {
  initial: SearchParams;
  resultCount: number;
  /**
   * Where the rewritten query string is pushed — the only reason this component
   * is not hardcoded to `/marketplace`.
   */
  basePath?: string;
}) {
  const { values, set, reset, liveCount } = useSearchQuerySync({
    initial,
    resultCount,
    basePath,
  });

  return (
    <aside aria-label="Search filters" className="space-y-5">
      <div>
        <Input
          id="search-q"
          label="Search"
          type="search"
          placeholder="probate, Manchester, M14…"
          value={values.q}
          onChange={(e) => set("q", e.target.value)}
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
            {values.maxPricePounds >= MAX_BUDGET
              ? "No limit"
              : poundsLabel(values.maxPricePounds)}
          </span>
        </label>
        <input
          id="search-budget"
          type="range"
          min={MIN_BUDGET}
          max={MAX_BUDGET}
          step={BUDGET_STEP}
          value={values.maxPricePounds}
          onChange={(e) => set("maxPricePounds", Number(e.target.value))}
          className="mt-2 w-full accent-accent"
        />
      </div>

      <MultiSelect
        label="EPC rating"
        options={EPC_OPTIONS}
        value={values.epcBands}
        onChange={(next) => set("epcBands", next)}
      />

      <MultiSelect
        label="Distress type"
        options={DISTRESS_TAG_OPTIONS}
        value={values.distressTags}
        onChange={(next) => set("distressTags", next)}
      />

      <Select
        id="search-type"
        label="Property type"
        options={TYPE_OPTIONS}
        value={values.propertyType}
        onChange={(e) => set("propertyType", e.target.value)}
      />

      <Select
        id="search-beds"
        label="Bedrooms"
        options={BEDS_OPTIONS}
        value={values.minBedrooms}
        onChange={(e) => set("minBedrooms", e.target.value)}
      />

      <Input
        id="search-roi"
        label="Minimum target ROI (%)"
        type="number"
        min={0}
        max={100}
        placeholder="Any"
        value={values.minRoiPct}
        onChange={(e) => set("minRoiPct", e.target.value)}
      />

      <Select
        id="search-sort"
        label="Sort by"
        options={SORT_OPTIONS}
        value={values.sort}
        onChange={(e) => set("sort", e.target.value)}
      />

      <Button type="button" variant="outline" onClick={reset} className="w-full">
        Clear filters
      </Button>
    </aside>
  );
}
