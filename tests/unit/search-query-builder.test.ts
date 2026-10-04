import { describe, expect, it } from "vitest";
import { DistressTag, EpcRating, PropertyType } from "@/generated/prisma/enums";
import {
  buildSearchQuery,
  buildSearchCountQuery,
  CARD_IMAGE_LIMIT,
} from "@/services/search/queryBuilder";

/**
 * The builder is pure — params in, a parameterised `Prisma.Sql` out — so every
 * filter can be asserted without a database. `Prisma.Sql` exposes `.text`
 * (with `$1…$n` placeholders) and `.values`; asserting on both proves the
 * filter is present *and* that its operand is bound as a parameter rather
 * than interpolated into the SQL string.
 *
 * Result correctness against real rows is covered separately, against the
 * seeded database, in tests/integration/search-service.test.ts.
 */

describe("buildSearchQuery — visibility", () => {
  it("restricts to marketable statuses even with no filters at all", () => {
    const { text, values } = buildSearchQuery({});

    expect(text).toContain(`"status" IN`);
    expect(values).toContain("LIVE");
    expect(values).toContain("UNDER_OFFER");
  });

  // SOLD listings are publicly *viewable* (the detail page renders them) but
  // are not stock a buyer can act on, so they stay out of search results.
  it("excludes SOLD, DRAFT and PENDING_REVIEW listings", () => {
    const { values } = buildSearchQuery({});

    expect(values).not.toContain("SOLD");
    expect(values).not.toContain("DRAFT");
    expect(values).not.toContain("PENDING_REVIEW");
  });
});

describe("buildSearchQuery — scalar filters", () => {
  it("adds no filter predicates when no params are given", () => {
    const { text } = buildSearchQuery({});

    expect(text).not.toContain("askingPriceGBP" + '" <=');
    expect(text).not.toContain(`"bedrooms" >=`);
    expect(text).not.toContain(`"targetRoiPct" >=`);
  });

  it("filters on maxPriceGBP as an integer-pence bind parameter", () => {
    const { text, values } = buildSearchQuery({ maxPriceGBP: 25_000_000 });

    expect(text).toContain(`"askingPriceGBP" <=`);
    expect(values).toContain(25_000_000);
  });

  it("filters on minBedrooms", () => {
    const { text, values } = buildSearchQuery({ minBedrooms: 3 });

    expect(text).toContain(`"bedrooms" >=`);
    expect(values).toContain(3);
  });

  it("filters on minRoiPct", () => {
    const { text, values } = buildSearchQuery({ minRoiPct: 15 });

    expect(text).toContain(`"targetRoiPct" >=`);
    expect(values).toContain(15);
  });

  it("filters on propertyType", () => {
    const { text, values } = buildSearchQuery({ propertyType: PropertyType.HMO });

    expect(text).toContain(`"propertyType" =`);
    expect(values).toContain(PropertyType.HMO);
  });

  // Region is free text from a dropdown, matched case-insensitively so
  // "west midlands" finds "West Midlands".
  it("filters on region case-insensitively", () => {
    const { text, values } = buildSearchQuery({ region: "west midlands" });

    expect(text.toLowerCase()).toContain(`lower(p."region") =`);
    expect(values).toContain("west midlands");
  });

  it("filters on epcBands with one bind parameter per band", () => {
    const { text, values } = buildSearchQuery({
      epcBands: [EpcRating.A, EpcRating.B, EpcRating.C],
    });

    expect(text).toContain(`"epcRating" IN`);
    expect(values).toEqual(expect.arrayContaining(["A", "B", "C"]));
  });

  // "ANY match", per the sprint plan — a listing tagged PROBATE alone must
  // match a search for [PROBATE, DAMP]. An `AND`-style match would be a
  // materially different (and much emptier) product.
  it("matches ANY of the requested distress tags, not all of them", () => {
    const { text, values } = buildSearchQuery({
      distressTags: [DistressTag.PROBATE, DistressTag.DAMP],
    });

    expect(text).toContain("EXISTS");
    expect(text).toContain(`"PropertyDistressTag"`);
    expect(text).toContain(`"tag" IN`);
    expect(values).toEqual(expect.arrayContaining(["PROBATE", "DAMP"]));
  });

  it("ignores an empty epcBands or distressTags array rather than matching nothing", () => {
    const { text } = buildSearchQuery({ epcBands: [], distressTags: [] });

    expect(text).not.toContain(`"epcRating" IN`);
    expect(text).not.toContain("EXISTS");
  });
});

describe("buildSearchQuery — geospatial", () => {
  it("filters by bounding box using the GIST-indexed location column", () => {
    const { text, values } = buildSearchQuery({
      bbox: { minLat: 53.3, minLng: -2.4, maxLat: 53.6, maxLng: -2.1 },
    });

    expect(text).toContain("ST_MakeEnvelope");
    expect(text).toContain(`"location"`);
    expect(values).toEqual(expect.arrayContaining([53.3, -2.4, 53.6, -2.1]));
  });

  // ST_DWithin on `geography` takes **metres**; passing kilometres would
  // silently return a 1000x-too-small radius.
  it("filters by centre and radius, converting km to metres", () => {
    const { text, values } = buildSearchQuery({
      centre: { lat: 53.4808, lng: -2.2426, radiusKm: 5 },
    });

    expect(text).toContain("ST_DWithin");
    expect(values).toContain(5000);
    expect(values).toEqual(expect.arrayContaining([53.4808, -2.2426]));
  });

  // Both are legitimate inputs from different UI affordances (drag the map vs.
  // "within 5 miles of here"); applying both would silently AND two areas.
  it("prefers bbox and ignores centre when both are supplied", () => {
    const { text } = buildSearchQuery({
      bbox: { minLat: 53.3, minLng: -2.4, maxLat: 53.6, maxLng: -2.1 },
      centre: { lat: 53.4808, lng: -2.2426, radiusKm: 5 },
    });

    expect(text).toContain("ST_MakeEnvelope");
    expect(text).not.toContain("ST_DWithin");
  });

  it("skips every geospatial predicate when neither is supplied", () => {
    const { text } = buildSearchQuery({});

    expect(text).not.toContain("ST_MakeEnvelope");
    expect(text).not.toContain("ST_DWithin");
  });
});

describe("buildSearchQuery — text search", () => {
  it("matches the FTS vector maintained by the Sprint 1 trigger", () => {
    const { text, values } = buildSearchQuery({ q: "probate manchester" });

    expect(text).toContain(`"searchVector" @@`);
    expect(text).toContain("websearch_to_tsquery");
    expect(values).toContain("probate manchester");
  });

  // FTS alone misses typos and partial words ("manchestr", "probat"), so the
  // predicate ORs in a pg_trgm similarity fallback.
  it("falls back to trigram similarity in the same predicate", () => {
    const { text } = buildSearchQuery({ q: "manchestr" });

    expect(text).toContain("similarity");
    expect(text).toMatch(/@@[\s\S]*OR[\s\S]*similarity/);
  });

  it("ignores a blank or whitespace-only query", () => {
    expect(buildSearchQuery({ q: "   " }).text).not.toContain("websearch_to_tsquery");
    expect(buildSearchQuery({ q: "" }).text).not.toContain("websearch_to_tsquery");
  });
});

describe("buildSearchQuery — sorting", () => {
  it("sorts by newest first by default", () => {
    const { text } = buildSearchQuery({});

    expect(text).toContain(`ORDER BY p."publishedAt" DESC`);
  });

  it("sorts by price ascending — cheapest first is what a budget search means", () => {
    const { text } = buildSearchQuery({ sort: "price" });

    expect(text).toContain(`ORDER BY p."askingPriceGBP" ASC`);
  });

  it("sorts by ROI descending — highest return first", () => {
    const { text } = buildSearchQuery({ sort: "roi" });

    expect(text).toContain(`ORDER BY p."targetRoiPct" DESC`);
  });

  it("sorts by ts_rank when relevance is requested with a query", () => {
    const { text } = buildSearchQuery({ q: "probate", sort: "relevance" });

    expect(text).toContain("ts_rank");
    expect(text).toContain("ORDER BY");
  });

  // ts_rank against an empty tsquery ranks everything 0, which would leave the
  // result order undefined — fall back to something deterministic.
  it("falls back to newest when relevance is requested without a query", () => {
    const { text } = buildSearchQuery({ sort: "relevance" });

    expect(text).not.toContain("ts_rank");
    expect(text).toContain(`ORDER BY p."publishedAt" DESC`);
  });

  // Without a tiebreaker, two rows with equal sort keys can swap between pages
  // and the same listing appears twice (or never).
  it("always appends a unique tiebreaker so pagination is stable", () => {
    for (const sort of ["newest", "price", "roi"] as const) {
      expect(buildSearchQuery({ sort }).text).toMatch(/ORDER BY[\s\S]*"id" ASC/);
    }
  });
});

describe("buildSearchQuery — pagination", () => {
  it("applies a default page size on the first page", () => {
    const { text, values } = buildSearchQuery({});

    expect(text).toContain("LIMIT");
    expect(text).toContain("OFFSET");
    expect(values).toContain(0);
  });

  it("offsets by (page - 1) * pageSize", () => {
    const { values } = buildSearchQuery({ page: 3, pageSize: 12 });

    expect(values).toContain(12);
    expect(values).toContain(24);
  });

  it("clamps an over-large page size rather than letting a caller ask for everything", () => {
    const { values } = buildSearchQuery({ pageSize: 5000 });

    expect(values).not.toContain(5000);
  });

  it("treats page 0 or a negative page as the first page", () => {
    expect(buildSearchQuery({ page: 0 }).values).toContain(0);
    expect(buildSearchQuery({ page: -4 }).values).toContain(0);
  });
});

describe("buildSearchCountQuery", () => {
  it("counts with the same predicates but no ordering or pagination", () => {
    const params = {
      q: "probate",
      maxPriceGBP: 25_000_000,
      distressTags: [DistressTag.PROBATE],
      centre: { lat: 53.48, lng: -2.24, radiusKm: 5 },
    };
    const count = buildSearchCountQuery(params);

    expect(count.text).toContain("COUNT(");
    expect(count.text).toContain(`"askingPriceGBP" <=`);
    expect(count.text).toContain("ST_DWithin");
    expect(count.text).toContain("EXISTS");
    expect(count.text).not.toContain("ORDER BY");
    expect(count.text).not.toContain("LIMIT");
  });
});

describe("buildSearchQuery — combinations", () => {
  it("ANDs every supplied filter together in one query", () => {
    const { text, values } = buildSearchQuery({
      q: "probate terrace",
      maxPriceGBP: 20_000_000,
      epcBands: [EpcRating.D, EpcRating.E],
      region: "Greater Manchester",
      propertyType: PropertyType.RESIDENTIAL,
      minBedrooms: 3,
      minRoiPct: 12,
      distressTags: [DistressTag.PROBATE, DistressTag.DAMP],
      centre: { lat: 53.4808, lng: -2.2426, radiusKm: 10 },
      sort: "relevance",
      page: 2,
      pageSize: 10,
    });

    for (const fragment of [
      `"status" IN`,
      `"askingPriceGBP" <=`,
      `"epcRating" IN`,
      `lower(p."region") =`,
      `"propertyType" =`,
      `"bedrooms" >=`,
      `"targetRoiPct" >=`,
      "EXISTS",
      "ST_DWithin",
      "websearch_to_tsquery",
      "ts_rank",
      "LIMIT",
      "OFFSET",
    ]) {
      expect(text, `missing fragment: ${fragment}`).toContain(fragment);
    }

    expect(values).toEqual(
      expect.arrayContaining([20_000_000, 3, 12, 10_000, 10, 10, "probate terrace"]),
    );
  });

  // Every user-supplied value must arrive as a bind parameter. If any of these
  // ever appears inside `.text`, the builder is interpolating and injectable.
  it("never interpolates a user value into the SQL string", () => {
    const nasty = '\'; DROP TABLE "Property"; --';
    const { text, values } = buildSearchQuery({ q: nasty, region: nasty });

    expect(text).not.toContain("DROP TABLE");
    expect(values).toContain(nasty);
  });
});

/**
 * The result card carries a photo carousel (ADR-020), so one query has to
 * return several images per listing without becoming a per-row round trip.
 */
describe("buildSearchQuery — card images", () => {
  it("selects a bounded array of photos alongside the cover image", () => {
    const { text, values } = buildSearchQuery({});

    expect(text).toContain(`AS "imageUrls"`);
    expect(text).toContain(`AS "imageUrl"`);
    // The cap is bound as a parameter, and the LIMIT sits inside the subquery
    // so Postgres stops reading rows rather than aggregating and discarding.
    expect(values).toContain(CARD_IMAGE_LIMIT);
    expect(text).toMatch(/LIMIT \$\d+\s*\)\s*pi/);
  });

  // The count query renders no cards, so paying for their photos would be
  // wasted work on the one query that runs on every keystroke.
  it("leaves the image arrays out of the count query", () => {
    const { text } = buildSearchCountQuery({});

    expect(text).not.toContain(`"imageUrls"`);
  });
});
