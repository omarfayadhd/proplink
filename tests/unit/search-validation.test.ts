import { describe, expect, it } from "vitest";
import { DistressTag, EpcRating, PropertyType } from "@/generated/prisma/enums";
import { parseSearchParams } from "@/services/search/validation";

/**
 * `parseSearchParams` is the single boundary between a URL and `SearchParams`.
 * Task 3.2's search page keeps its whole state in the query string (shareable
 * searches), so the same parser has to serve both the page and the API route —
 * anything it accepts on one side must mean the same on the other.
 */
const parse = (qs: string) => parseSearchParams(new URLSearchParams(qs));

describe("parseSearchParams", () => {
  it("returns empty params for an empty query string", () => {
    expect(parse("")).toEqual({});
  });

  it("reads the free-text query", () => {
    expect(parse("q=probate+terrace").q).toBe("probate terrace");
  });

  // The URL carries pounds because a shared link should be human-readable;
  // pence is an internal representation (AGENTS.md keeps money in pence).
  it("converts maxPrice from pounds in the URL to integer pence", () => {
    expect(parse("maxPrice=250000").maxPriceGBP).toBe(25_000_000);
  });

  it("reads comma-separated EPC bands", () => {
    expect(parse("epc=A,B,C").epcBands).toEqual([EpcRating.A, EpcRating.B, EpcRating.C]);
  });

  it("reads comma-separated distress tags", () => {
    expect(parse("tags=PROBATE,DAMP").distressTags).toEqual([
      DistressTag.PROBATE,
      DistressTag.DAMP,
    ]);
  });

  it("reads the scalar filters", () => {
    const params = parse("type=HMO&beds=3&roi=12.5&region=Greater+Manchester");

    expect(params.propertyType).toBe(PropertyType.HMO);
    expect(params.minBedrooms).toBe(3);
    expect(params.minRoiPct).toBe(12.5);
    expect(params.region).toBe("Greater Manchester");
  });

  it("reads a bbox in west,south,east,north order", () => {
    expect(parse("bbox=-2.4,53.3,-2.1,53.6").bbox).toEqual({
      minLng: -2.4,
      minLat: 53.3,
      maxLng: -2.1,
      maxLat: 53.6,
    });
  });

  it("reads a centre and radius", () => {
    expect(parse("lat=53.4808&lng=-2.2426&radiusKm=5").centre).toEqual({
      lat: 53.4808,
      lng: -2.2426,
      radiusKm: 5,
    });
  });

  it("reads sort and pagination", () => {
    const params = parse("sort=price&page=3&pageSize=12");

    expect(params.sort).toBe("price");
    expect(params.page).toBe(3);
    expect(params.pageSize).toBe(12);
  });

  // A hand-edited or stale shared URL must degrade to a broader search, never
  // to a 500 or — worse — a silently wrong filter.
  describe("hostile and malformed input", () => {
    it("drops unknown enum values rather than passing them to Postgres", () => {
      expect(parse("epc=A,Z,B").epcBands).toEqual([EpcRating.A, EpcRating.B]);
      expect(parse("tags=PROBATE,NONSENSE").distressTags).toEqual([DistressTag.PROBATE]);
      expect(parse("type=SPACESHIP").propertyType).toBeUndefined();
      expect(parse("sort=bananas").sort).toBeUndefined();
    });

    it("drops a filter list that ends up empty", () => {
      expect(parse("epc=Z&tags=NONSENSE").epcBands).toBeUndefined();
      expect(parse("epc=Z&tags=NONSENSE").distressTags).toBeUndefined();
    });

    it("drops non-numeric numbers instead of coercing them to NaN", () => {
      const params = parse("maxPrice=cheap&beds=lots&roi=high&page=first");

      expect(params.maxPriceGBP).toBeUndefined();
      expect(params.minBedrooms).toBeUndefined();
      expect(params.minRoiPct).toBeUndefined();
      expect(params.page).toBeUndefined();
    });

    it("drops an incomplete bbox rather than guessing the missing edge", () => {
      expect(parse("bbox=-2.4,53.3,-2.1").bbox).toBeUndefined();
      expect(parse("bbox=a,b,c,d").bbox).toBeUndefined();
    });

    it("drops a centre missing its radius, or a radius missing its centre", () => {
      expect(parse("lat=53.48&lng=-2.24").centre).toBeUndefined();
      expect(parse("radiusKm=5").centre).toBeUndefined();
    });

    it("rejects out-of-range coordinates", () => {
      expect(parse("lat=999&lng=-2.24&radiusKm=5").centre).toBeUndefined();
      expect(parse("bbox=-2.4,53.3,-2.1,900").bbox).toBeUndefined();
    });

    it("rejects a negative or absurd radius", () => {
      expect(parse("lat=53.48&lng=-2.24&radiusKm=-5").centre).toBeUndefined();
      expect(parse("lat=53.48&lng=-2.24&radiusKm=99999").centre).toBeUndefined();
    });

    it("ignores a blank text query", () => {
      expect(parse("q=++").q).toBeUndefined();
    });

    it("rejects a negative price, bedroom count or ROI", () => {
      const params = parse("maxPrice=-100&beds=-2&roi=-5");

      expect(params.maxPriceGBP).toBeUndefined();
      expect(params.minBedrooms).toBeUndefined();
      expect(params.minRoiPct).toBeUndefined();
    });
  });
});
