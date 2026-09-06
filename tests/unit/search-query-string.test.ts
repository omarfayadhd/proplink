import { describe, expect, it } from "vitest";
import { DistressTag, EpcRating, PropertyType } from "@/generated/prisma/enums";
import { parseSearchParams } from "@/services/search/validation";
import { buildSearchQueryString } from "@/services/search/queryString";
import type { SearchParams } from "@/services/search/types";

/**
 * The exact inverse of `parseSearchParams`. Task 3.2's `/marketplace` keeps its
 * entire state in the URL so a search is shareable, which means every filter
 * has to survive a round trip — build it, paste it, parse it, get the same
 * search back. The round-trip tests below are the real contract; the
 * field-by-field ones exist to say *why* a trip failed when one does.
 */
const roundTrip = (params: SearchParams) =>
  parseSearchParams(new URLSearchParams(buildSearchQueryString(params)));

describe("buildSearchQueryString", () => {
  it("produces an empty string for an empty search", () => {
    expect(buildSearchQueryString({})).toBe("");
  });

  // A URL full of `epc=&tags=&q=` is noise in a shared link and, worse, makes
  // two identical searches look like different URLs to caches and analytics.
  it("omits absent and empty filters rather than emitting blank keys", () => {
    const qs = buildSearchQueryString({ epcBands: [], distressTags: [], q: "" });

    expect(qs).toBe("");
  });

  it("writes money back as pounds, matching what the parser expects", () => {
    expect(buildSearchQueryString({ maxPriceGBP: 25_000_000 })).toContain(
      "maxPrice=250000",
    );
  });

  it("writes enum lists comma-separated", () => {
    const qs = buildSearchQueryString({
      epcBands: [EpcRating.A, EpcRating.B],
      distressTags: [DistressTag.PROBATE, DistressTag.DAMP],
    });

    expect(decodeURIComponent(qs)).toContain("epc=A,B");
    expect(decodeURIComponent(qs)).toContain("tags=PROBATE,DAMP");
  });

  it("writes a bbox in the west,south,east,north order the parser reads", () => {
    const qs = buildSearchQueryString({
      bbox: { minLng: -2.4, minLat: 53.3, maxLng: -2.1, maxLat: 53.6 },
    });

    expect(decodeURIComponent(qs)).toContain("bbox=-2.4,53.3,-2.1,53.6");
  });

  // Page 1 is the default; carrying it makes every shared link look like it
  // came from pagination and creates two URLs for one search.
  it("omits page 1", () => {
    expect(buildSearchQueryString({ page: 1 })).toBe("");
    expect(buildSearchQueryString({ page: 2 })).toContain("page=2");
  });

  it("omits the default sort", () => {
    expect(buildSearchQueryString({ sort: "newest" })).toBe("");
    expect(buildSearchQueryString({ sort: "price" })).toContain("sort=price");
  });
});

describe("round trip through parseSearchParams", () => {
  it("survives a single text query", () => {
    expect(roundTrip({ q: "probate terrace" })).toEqual({ q: "probate terrace" });
  });

  it("survives every scalar filter", () => {
    const params: SearchParams = {
      maxPriceGBP: 25_000_000,
      region: "Greater Manchester",
      propertyType: PropertyType.HMO,
      minBedrooms: 3,
      minRoiPct: 12.5,
    };

    expect(roundTrip(params)).toEqual(params);
  });

  it("survives enum lists", () => {
    const params: SearchParams = {
      epcBands: [EpcRating.D, EpcRating.E, EpcRating.F],
      distressTags: [DistressTag.PROBATE, DistressTag.ROOF_REQUIRED],
    };

    expect(roundTrip(params)).toEqual(params);
  });

  it("survives a bbox", () => {
    const params: SearchParams = {
      bbox: { minLng: -2.4, minLat: 53.3, maxLng: -2.1, maxLat: 53.6 },
    };

    expect(roundTrip(params)).toEqual(params);
  });

  it("survives a centre and radius", () => {
    const params: SearchParams = {
      centre: { lat: 53.4808, lng: -2.2426, radiusKm: 5 },
    };

    expect(roundTrip(params)).toEqual(params);
  });

  it("survives sort and pagination", () => {
    const params: SearchParams = { sort: "roi", page: 3, pageSize: 12 };

    expect(roundTrip(params)).toEqual(params);
  });

  // The one that matters: the "copy this link" case.
  it("survives every filter at once", () => {
    const params: SearchParams = {
      q: "probate terrace",
      maxPriceGBP: 20_000_000,
      epcBands: [EpcRating.D, EpcRating.E],
      region: "Greater Manchester",
      propertyType: PropertyType.RESIDENTIAL,
      minBedrooms: 3,
      minRoiPct: 12,
      distressTags: [DistressTag.PROBATE, DistressTag.DAMP],
      centre: { lat: 53.4808, lng: -2.2426, radiusKm: 10 },
      sort: "price",
      page: 2,
      pageSize: 12,
    };

    expect(roundTrip(params)).toEqual(params);
  });

  it("round-trips a region containing characters that need escaping", () => {
    const params: SearchParams = { region: "Tyne & Wear", q: "50% ROI + cash" };

    expect(roundTrip(params)).toEqual(params);
  });

  // bbox wins in the query builder, so the URL must not carry a stale centre
  // alongside it — a shared link would otherwise mean something different once
  // the bbox is edited out.
  it("writes only the bbox when both bbox and centre are set", () => {
    const qs = buildSearchQueryString({
      bbox: { minLng: -2.4, minLat: 53.3, maxLng: -2.1, maxLat: 53.6 },
      centre: { lat: 53.4808, lng: -2.2426, radiusKm: 5 },
    });

    expect(qs).toContain("bbox=");
    expect(qs).not.toContain("lat=");
    expect(qs).not.toContain("radiusKm=");
  });
});
