"use client";

import Link from "next/link";
import { useState } from "react";
import { EpcRating, PropertyType } from "@/generated/prisma/enums";
import { DISTRESS_TAG_OPTIONS } from "@/components/listings/wizardTypes";
import type { SearchParams } from "@/services/search/types";
import {
  MAX_BUDGET,
  MIN_BUDGET,
  BUDGET_STEP,
  useSearchQuerySync,
  type FilterValues,
} from "@/components/marketplace/useSearchQuerySync";
import { AffordabilityPanel } from "@/components/buy/AffordabilityPanel";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/cn";

/**
 * The buyer portal's search controls (ADR-020): a location field and a row of
 * filter popovers, in place of the left-hand rail the public marketplace uses.
 *
 * **Why a bar and not the rail.** The rail was built for `/marketplace`, where
 * it is the page's furniture. On the buyer side it competed with the results
 * for the first screen, and it opened with the whole filter vocabulary at once
 * — EPC bands, eight defect types, target ROI — which is the investor's
 * vocabulary, not a consumer's. The bar puts price and beds first, keeps
 * everything else one click inside `More`, and gives the results the width.
 *
 * All filter behaviour is `useSearchQuerySync` — the same hook the rail uses,
 * so the two presentations cannot drift apart about what a filter means.
 *
 * The results toolbar is rendered here rather than beside the grid because the
 * count it shows is the hook's *live* count: it has to move while the budget
 * slider is still being dragged, which a server-rendered total cannot do.
 */

const BEDS = [
  { value: "", label: "Any" },
  ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}+` })),
];

const TYPES = [
  { value: "", label: "Any type" },
  ...Object.values(PropertyType).map((t) => ({
    value: t,
    label: t.charAt(0) + t.slice(1).toLowerCase(),
  })),
];

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "price", label: "Price: low to high" },
  { value: "roi", label: "Highest ROI" },
  { value: "relevance", label: "Most relevant" },
];

const TAG_LABELS = new Map(DISTRESS_TAG_OPTIONS.map((o) => [o.value, o.label]));

const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/** A row of mutually exclusive options — the popover's workhorse control. */
function OptionRow({
  options,
  value,
  onChange,
  columns = 3,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (next: string) => void;
  columns?: number;
}) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            value === o.value
              ? "border-primary bg-primary text-white"
              : "border-line bg-white text-body hover:border-primary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ChipToggles({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() =>
              onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])
            }
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              on
                ? "border-accent bg-accent text-white"
                : "border-line bg-white text-secondary hover:border-accent",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** One removable summary of an active filter, shown under the bar. */
function ActiveChip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-pale py-1 pr-1.5 pl-3 text-xs font-semibold text-secondary">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${typeof children === "string" ? children : ""}`}
        className="flex h-4 w-4 items-center justify-center rounded-full text-secondary transition-colors hover:bg-secondary hover:text-white"
      >
        <span aria-hidden>×</span>
      </button>
    </span>
  );
}

export function SearchControls({
  initial,
  resultCount,
  view,
  basePath = "/buy",
}: {
  initial: SearchParams;
  resultCount: number;
  /** Carried through every URL this writes, so a filter change keeps the view. */
  view: "grid" | "list";
  basePath?: string;
}) {
  const { values, set, patch, reset, liveCount, activeCount, filterQuery } =
    useSearchQuerySync({
      initial,
      resultCount,
      basePath,
      extra: { view: view === "list" ? "list" : undefined },
    });

  const [sheetOpen, setSheetOpen] = useState(false);

  const budgetSet = values.maxPricePounds < MAX_BUDGET;
  const budgetLabel = budgetSet
    ? `Up to ${GBP.format(values.maxPricePounds)}`
    : undefined;

  /** A view link keeps the current search — only `view` changes. */
  function viewHref(next: "grid" | "list") {
    const qs = [filterQuery, next === "list" ? "view=list" : ""]
      .filter(Boolean)
      .join("&");
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const budgetControl = (
    <div className="space-y-4">
      <div>
        <label htmlFor="budget-slider" className="block text-sm font-medium text-body">
          Max budget:{" "}
          <span data-testid="budget-value" className="font-semibold text-primary">
            {budgetSet ? GBP.format(values.maxPricePounds) : "No limit"}
          </span>
        </label>
        <input
          id="budget-slider"
          type="range"
          min={MIN_BUDGET}
          max={MAX_BUDGET}
          step={BUDGET_STEP}
          value={values.maxPricePounds}
          onChange={(e) => set("maxPricePounds", Number(e.target.value))}
          className="mt-3 w-full accent-accent"
        />
        <div className="mt-1 flex justify-between text-[11px] text-muted">
          <span>{GBP.format(MIN_BUDGET)}</span>
          <span>No limit</span>
        </div>
      </div>
    </div>
  );

  const moreControls = (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-body">Distress type</p>
        <p className="mt-0.5 text-xs text-muted">
          Why the property is priced the way it is. Matching any one is enough.
        </p>
        <div className="mt-2.5">
          <ChipToggles
            label="Distress type"
            options={DISTRESS_TAG_OPTIONS}
            value={values.distressTags}
            onChange={(next) => set("distressTags", next)}
          />
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-body">Minimum target ROI (%)</span>
        <input
          type="number"
          min={0}
          max={100}
          placeholder="Any"
          value={values.minRoiPct}
          onChange={(e) => set("minRoiPct", e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </label>
    </div>
  );

  const epcControl = (
    <div>
      <p className="text-xs text-muted">
        Every UK listing must show an EPC rating. A is most efficient, G least.
      </p>
      <div className="mt-3">
        <ChipToggles
          label="EPC rating"
          options={Object.values(EpcRating).map((b) => ({ value: b, label: b }))}
          value={values.epcBands}
          onChange={(next) => set("epcBands", next)}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Sticky, so the filters stay reachable however far the buyer scrolls —
          the rail scrolled away and left them with no way back but the top.
          `top-0`, not `top-16`: `<SiteHeader>` is only pinned on the overlay
          routes, and `/buy` is no longer one of them (ADR-020), so it scrolls
          away and leaves the viewport edge for this. */}
      <div className="sticky top-0 z-20 -mx-6 border-b border-line bg-white/90 px-6 backdrop-blur">
        <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-3 py-2.5">
          {/* Capped rather than `flex-1`: an input stretched across two thirds
              of a 1440px page reads as a search *page*, not as one control on a
              toolbar, and the width buys nothing — a postcode is eight
              characters. The cap is what lets sort and layout share this row
              instead of needing a second one. */}
          <div className="relative min-w-0 basis-full sm:max-w-sm sm:flex-1 sm:basis-auto">
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-muted"
            >
              ⌕
            </span>
            <input
              id="search-q"
              type="search"
              aria-label="Search by town, postcode or keyword"
              placeholder="Town, postcode or keyword"
              value={values.q}
              onChange={(e) => set("q", e.target.value)}
              className="w-full rounded-full border border-line bg-white py-1.5 pr-3.5 pl-9 text-[13px] text-primary placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </div>

          {/* Popovers on a real pointer; one sheet on a phone, where five
                dropdowns in a scrolling row is a worse answer than a panel. */}
          <div className="hidden flex-wrap items-center gap-2 md:flex">
            <Popover label="Price" summary={budgetLabel} active={budgetSet}>
              <div className="space-y-5">
                {budgetControl}
                <details className="border-t border-line pt-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-primary underline decoration-line underline-offset-4 hover:decoration-accent">
                    Work out what I can afford
                  </summary>
                  <div className="mt-4">
                    <AffordabilityPanel
                      onApply={(pounds) =>
                        // Clamp: the slider cannot express a budget above its
                        // own ceiling, and a value outside the range would
                        // leave the thumb pinned and the label lying.
                        set(
                          "maxPricePounds",
                          Math.min(MAX_BUDGET, Math.max(MIN_BUDGET, pounds)),
                        )
                      }
                    />
                  </div>
                </details>
              </div>
            </Popover>

            <Popover
              label="Beds"
              summary={values.minBedrooms ? `${values.minBedrooms}+ beds` : undefined}
              active={!!values.minBedrooms}
              panelClassName="w-[18rem]"
            >
              <OptionRow
                options={BEDS}
                value={values.minBedrooms}
                onChange={(v) => set("minBedrooms", v)}
              />
            </Popover>

            <Popover
              label="Property type"
              summary={
                values.propertyType
                  ? TYPES.find((t) => t.value === values.propertyType)?.label
                  : undefined
              }
              active={!!values.propertyType}
              panelClassName="w-[18rem]"
            >
              <OptionRow
                columns={2}
                options={TYPES}
                value={values.propertyType}
                onChange={(v) => set("propertyType", v)}
              />
            </Popover>

            <Popover
              label="EPC"
              summary={
                values.epcBands.length ? `EPC ${values.epcBands.join(", ")}` : undefined
              }
              active={values.epcBands.length > 0}
            >
              {epcControl}
            </Popover>

            <Popover
              label="More"
              summary={
                values.distressTags.length || values.minRoiPct
                  ? `More (${values.distressTags.length + (values.minRoiPct ? 1 : 0)})`
                  : undefined
              }
              active={values.distressTags.length > 0 || !!values.minRoiPct}
              align="end"
              panelClassName="w-[24rem]"
            >
              {moreControls}
            </Popover>
          </div>

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] font-medium text-body md:hidden"
          >
            Filters
            {activeCount > 0 && (
              <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>

          {/* Sort and layout live on the filter row rather than in a toolbar
                of their own. They are the same kind of thing — controls over
                the result set — and giving them a second full-width band was a
                third stacked strip of chrome above the first property. */}
          <div className="ml-auto flex items-center gap-2">
            <select
              aria-label="Sort by"
              value={values.sort}
              onChange={(e) => set("sort", e.target.value)}
              className="rounded-full border border-line bg-white py-1.5 pr-7 pl-3.5 text-[13px] font-medium text-body focus:border-primary focus:outline-none"
            >
              {SORTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* Links, not state: the view is in the URL, so it survives a
                  reload and a shared link opens the way the sender was reading
                  it. */}
            <div
              className="hidden items-center rounded-full border border-line p-0.5 sm:flex"
              role="group"
              aria-label="Results layout"
            >
              {(["grid", "list"] as const).map((mode) => (
                <Link
                  key={mode}
                  href={viewHref(mode)}
                  scroll={false}
                  aria-current={view === mode ? "true" : undefined}
                  className={cn(
                    "rounded-full px-3 py-1 text-[13px] font-medium capitalize transition-colors",
                    view === mode
                      ? "bg-primary text-white"
                      : "text-muted hover:text-primary",
                  )}
                >
                  {mode}
                </Link>
              ))}
            </div>
          </div>

          {/* `w-full` because this is now a flex item on the control row
                itself: without it the chips would try to sit beside the
                controls instead of wrapping under them. */}
          {activeCount > 0 && (
            <div className="flex w-full flex-wrap items-center gap-2 pb-0.5">
              {budgetSet && (
                <ActiveChip onRemove={() => set("maxPricePounds", MAX_BUDGET)}>
                  {`Up to ${GBP.format(values.maxPricePounds)}`}
                </ActiveChip>
              )}
              {values.minBedrooms && (
                <ActiveChip onRemove={() => set("minBedrooms", "")}>
                  {`${values.minBedrooms}+ beds`}
                </ActiveChip>
              )}
              {values.propertyType && (
                <ActiveChip onRemove={() => set("propertyType", "")}>
                  {TYPES.find((t) => t.value === values.propertyType)?.label ?? ""}
                </ActiveChip>
              )}
              {values.epcBands.map((band) => (
                <ActiveChip
                  key={band}
                  onRemove={() =>
                    set(
                      "epcBands",
                      values.epcBands.filter((b) => b !== band),
                    )
                  }
                >
                  {`EPC ${band}`}
                </ActiveChip>
              ))}
              {values.distressTags.map((tag) => (
                <ActiveChip
                  key={tag}
                  onRemove={() =>
                    set(
                      "distressTags",
                      values.distressTags.filter((t) => t !== tag),
                    )
                  }
                >
                  {TAG_LABELS.get(tag as never) ?? tag}
                </ActiveChip>
              ))}
              {values.minRoiPct && (
                <ActiveChip onRemove={() => set("minRoiPct", "")}>
                  {`${values.minRoiPct}%+ ROI`}
                </ActiveChip>
              )}
              {values.q.trim() && (
                <ActiveChip
                  onRemove={() => set("q", "")}
                >{`“${values.q.trim()}”`}</ActiveChip>
              )}
              <button
                type="button"
                onClick={reset}
                className="text-xs font-semibold text-muted underline decoration-line underline-offset-4 hover:text-primary"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* What is left of the toolbar: the count alone, as a line of text over
          the grid. Sort and layout moved onto the filter row above — this never
          needed a bordered band of its own. */}
      <p
        data-testid="result-count"
        aria-live="polite"
        className="mt-5 text-[13px] text-muted"
      >
        {liveCount === null ? (
          "Counting…"
        ) : (
          <>
            <span className="font-semibold text-primary">
              {liveCount.toLocaleString("en-GB")} {liveCount === 1 ? "home" : "homes"}
            </span>{" "}
            for sale
          </>
        )}
      </p>

      {/* Mobile filter sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold text-primary">Filters</h2>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              aria-label="Close filters"
              className="text-2xl leading-none text-muted"
            >
              ×
            </button>
          </div>

          <div className="flex-1 space-y-7 overflow-y-auto px-5 py-6">
            <section>
              <h3 className="mb-3 text-sm font-semibold text-primary">Price</h3>
              {budgetControl}
              <details className="mt-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-primary underline decoration-line underline-offset-4">
                  Work out what I can afford
                </summary>
                <div className="mt-4">
                  <AffordabilityPanel
                    onApply={(pounds) =>
                      set(
                        "maxPricePounds",
                        Math.min(MAX_BUDGET, Math.max(MIN_BUDGET, pounds)),
                      )
                    }
                  />
                </div>
              </details>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-primary">Bedrooms</h3>
              <OptionRow
                options={BEDS}
                value={values.minBedrooms}
                onChange={(v) => set("minBedrooms", v)}
              />
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-primary">Property type</h3>
              <OptionRow
                columns={2}
                options={TYPES}
                value={values.propertyType}
                onChange={(v) => set("propertyType", v)}
              />
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-primary">EPC rating</h3>
              {epcControl}
            </section>

            <section>{moreControls}</section>
          </div>

          <div className="flex items-center gap-3 border-t border-line px-5 py-4">
            <button
              type="button"
              onClick={() => patch({ ...emptyFilters, sort: values.sort })}
              className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-body"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="flex-1 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
            >
              {liveCount === null ? "Show homes" : `Show ${liveCount} homes`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** The sheet's Clear button resets the filters but leaves the sort alone. */
const emptyFilters: Omit<FilterValues, "sort"> = {
  q: "",
  maxPricePounds: MAX_BUDGET,
  epcBands: [],
  distressTags: [],
  propertyType: "",
  minBedrooms: "",
  minRoiPct: "",
};
