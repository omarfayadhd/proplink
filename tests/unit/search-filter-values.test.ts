import { describe, expect, it } from "vitest";
import {
  countActive,
  MAX_BUDGET,
  type FilterValues,
} from "@/components/marketplace/useSearchQuerySync";

/**
 * The buyer's filter bar shows a count on its mobile "Filters" button and a
 * removable chip per active filter (ADR-020). Both read from `countActive`, so
 * a wrong answer here is a badge that claims filters the buyer did not set —
 * or, worse, hides ones they did.
 */

const none: FilterValues = {
  q: "",
  maxPricePounds: MAX_BUDGET,
  epcBands: [],
  distressTags: [],
  propertyType: "",
  minBedrooms: "",
  minRoiPct: "",
  sort: "newest",
};

describe("countActive", () => {
  it("counts nothing for an untouched search", () => {
    expect(countActive(none)).toBe(0);
  });

  // The slider's top stop means "no upper limit", not "£500,000" — the search
  // params drop it, so the chip row must not claim it either.
  it("does not count a budget parked at the top of the range", () => {
    expect(countActive({ ...none, maxPricePounds: MAX_BUDGET })).toBe(0);
    expect(countActive({ ...none, maxPricePounds: MAX_BUDGET - 5_000 })).toBe(1);
  });

  // Sort reorders results; it never removes one. Counting it would put a
  // "1 filter" badge on every search a buyer has merely re-sorted.
  it("does not count the sort order", () => {
    expect(countActive({ ...none, sort: "price" })).toBe(0);
  });

  it("counts each selected band and tag separately, since each is its own chip", () => {
    expect(
      countActive({
        ...none,
        epcBands: ["C", "D"],
        distressTags: ["PROBATE", "DAMP", "ASBESTOS"],
      }),
    ).toBe(5);
  });

  it("ignores a whitespace-only query, which narrows nothing", () => {
    expect(countActive({ ...none, q: "   " })).toBe(0);
    expect(countActive({ ...none, q: "Manchester" })).toBe(1);
  });

  it("sums every kind of filter at once", () => {
    expect(
      countActive({
        q: "probate",
        maxPricePounds: 250_000,
        epcBands: ["D"],
        distressTags: ["DAMP"],
        propertyType: "RESIDENTIAL",
        minBedrooms: "3",
        minRoiPct: "15",
        sort: "roi",
      }),
    ).toBe(7);
  });
});
