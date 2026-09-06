import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { DistressTag, EpcRating, PropertyType } from "@/generated/prisma/enums";
import { buildSearchCountQuery } from "@/services/search/queryBuilder";
import { PostgresSearchService } from "@/services/search/postgresSearchService";
import type { SearchParams } from "@/services/search/types";

/**
 * Task 3.1's SQL is PostGIS + FTS + pg_trgm — none of which a mock can verify.
 * `search-query-builder.test.ts` proves the right SQL is *generated*; this file
 * proves Postgres agrees, by running it against the Task 2.7 seed catalogue
 * (40 listings, 12 cities, every distress tag and EPC band).
 *
 * Skipped wholesale when there is no database, so `npm run test` stays green in
 * a DB-less CI job — the same `hasDb` convention the Playwright specs use.
 *
 * These tests read the seed and never write to it. Assertions are relative
 * ("this filter returns fewer rows than none", "every returned row satisfies
 * the filter") rather than exact counts, because the Playwright specs create
 * and delete listings of their own — so hardcoded totals would break the moment
 * the two suites ran at the same time. The one exception is the full-set paging
 * test, which does assume the catalogue is stable for its duration; run the
 * suites sequentially, not concurrently.
 */
const hasDb = !!(process.env.DATABASE_URL ?? process.env.DIRECT_URL);

const service = new PostgresSearchService();

afterAll(async () => {
  if (hasDb) await db.$disconnect();
});

describe.skipIf(!hasDb)("PostgresSearchService against the seeded database", () => {
  it("returns only marketable listings and never a SOLD one", async () => {
    const result = await service.search({ pageSize: 100 });

    expect(result.total).toBeGreaterThan(0);
    for (const item of result.items) {
      expect(["LIVE", "UNDER_OFFER"]).toContain(item.status);
    }
  });

  it("hydrates each card with its first image and its distress tags", async () => {
    const { items } = await service.search({ pageSize: 5 });

    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.imageUrl).toMatch(/^\/uploads\/seed\/plate-\d{2}\.jpg$/);
      expect(item.distressTags.length).toBeGreaterThan(0);
      expect(typeof item.askingPriceGBP).toBe("number");
    }

    // Covers are offset by listing index (prisma/seed.ts), so a page of results
    // does not lead with the same photograph over and over. Without the offset
    // every card's `sortOrder: 0` image was plate-01.
    const covers = new Set(items.map((i) => i.imageUrl));
    expect(covers.size).toBeGreaterThan(1);
  });

  it("reads coordinates back out of the PostGIS column", async () => {
    const { items } = await service.search({ pageSize: 5 });

    for (const item of items) {
      // Every seeded listing has a location, and all 12 cities are in the UK.
      expect(item.lat).toBeGreaterThan(49);
      expect(item.lat).toBeLessThan(61);
      expect(item.lng).toBeGreaterThan(-9);
      expect(item.lng).toBeLessThan(2);
    }
  });

  describe("each filter narrows the result set correctly", () => {
    it("maxPriceGBP", async () => {
      const cap = 15_000_000; // £150,000
      const { items, total } = await service.search({
        maxPriceGBP: cap,
        pageSize: 100,
      });

      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThan(await service.count({}));
      for (const item of items) expect(item.askingPriceGBP).toBeLessThanOrEqual(cap);
    });

    it("epcBands", async () => {
      const { items, total } = await service.search({
        epcBands: [EpcRating.A, EpcRating.B],
        pageSize: 100,
      });

      expect(total).toBeGreaterThan(0);
      for (const item of items) expect(["A", "B"]).toContain(item.epcRating);
    });

    it("propertyType", async () => {
      const { items, total } = await service.search({
        propertyType: PropertyType.HMO,
        pageSize: 100,
      });

      expect(total).toBeGreaterThan(0);
      for (const item of items) expect(item.propertyType).toBe("HMO");
    });

    it("minBedrooms", async () => {
      const { items } = await service.search({ minBedrooms: 4, pageSize: 100 });

      expect(items.length).toBeGreaterThan(0);
      for (const item of items) expect(item.bedrooms).toBeGreaterThanOrEqual(4);
    });

    it("minRoiPct", async () => {
      const { items } = await service.search({ minRoiPct: 20, pageSize: 100 });

      expect(items.length).toBeGreaterThan(0);
      for (const item of items) expect(item.targetRoiPct).toBeGreaterThanOrEqual(20);
    });

    it("region, case-insensitively", async () => {
      const exact = await service.count({ region: "Greater Manchester" });
      const lowered = await service.count({ region: "greater manchester" });

      expect(exact).toBeGreaterThan(0);
      expect(lowered).toBe(exact);
    });

    // The rule that would be easiest to get wrong: ANY, not ALL.
    it("distressTags matches ANY tag, so a multi-tag search is a union", async () => {
      const probate = await service.count({ distressTags: [DistressTag.PROBATE] });
      const damp = await service.count({ distressTags: [DistressTag.DAMP] });
      const either = await service.count({
        distressTags: [DistressTag.PROBATE, DistressTag.DAMP],
      });

      expect(probate).toBeGreaterThan(0);
      expect(damp).toBeGreaterThan(0);
      expect(either).toBeGreaterThanOrEqual(Math.max(probate, damp));
      expect(either).toBeLessThanOrEqual(probate + damp);
    });

    it("returns each listing once even when it carries two requested tags", async () => {
      const { items } = await service.search({
        distressTags: [DistressTag.RENOVATION_NEEDED, DistressTag.DAMP],
        pageSize: 100,
      });

      expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    });
  });

  describe("geospatial", () => {
    // Manchester's seeded listings sit within ~1km of the city centre.
    const manchester = { lat: 53.4808, lng: -2.2426 };

    it("centre + radius finds nearby listings and excludes distant ones", async () => {
      const near = await service.search({
        centre: { ...manchester, radiusKm: 10 },
        pageSize: 100,
      });

      expect(near.total).toBeGreaterThan(0);
      for (const item of near.items) expect(item.city).toBe("Manchester");
    });

    it("a tighter radius returns no more than a wider one", async () => {
      const wide = await service.count({ centre: { ...manchester, radiusKm: 50 } });
      const tight = await service.count({ centre: { ...manchester, radiusKm: 2 } });

      expect(tight).toBeLessThanOrEqual(wide);
      expect(wide).toBeGreaterThan(0);
    });

    // Guards the km→metres conversion: at 0.001 km (1 metre) nothing but an
    // exact hit can match. If the radius were passed as km, this would return
    // everything within a kilometre and the test would fail.
    it("treats the radius as kilometres, not metres", async () => {
      const oneMetre = await service.count({
        centre: { ...manchester, radiusKm: 0.001 },
      });

      expect(oneMetre).toBe(0);
    });

    it("bbox finds listings inside the box and nothing outside it", async () => {
      const { items, total } = await service.search({
        bbox: { minLng: -2.4, minLat: 53.3, maxLng: -2.1, maxLat: 53.6 },
        pageSize: 100,
      });

      expect(total).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.lat).toBeGreaterThanOrEqual(53.3);
        expect(item.lat).toBeLessThanOrEqual(53.6);
        expect(item.lng).toBeGreaterThanOrEqual(-2.4);
        expect(item.lng).toBeLessThanOrEqual(-2.1);
      }
    });
  });

  describe("text search", () => {
    it("finds listings by a word in the description via FTS", async () => {
      const { total } = await service.search({ q: "probate", pageSize: 100 });

      expect(total).toBeGreaterThan(0);
    });

    it("finds listings by city name", async () => {
      const { items } = await service.search({ q: "Nottingham", pageSize: 100 });

      expect(items.length).toBeGreaterThan(0);
      expect(items.some((i) => i.city === "Nottingham")).toBe(true);
    });

    // The reason the trigram fallback exists: FTS alone returns nothing here.
    it("still finds something when the query is misspelled", async () => {
      const ftsOnly = await db.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS "count" FROM "Property" p
        WHERE p."searchVector" @@ websearch_to_tsquery('english', 'Manchestor')
      `;
      expect(ftsOnly[0].count).toBe(0);

      const withFallback = await service.count({ q: "Manchestor" });
      expect(withFallback).toBeGreaterThan(0);
    });

    it("returns nothing for a query that matches nothing", async () => {
      expect(await service.count({ q: "zzzqqqxxx" })).toBe(0);
    });
  });

  describe("sorting and pagination", () => {
    it("sorts by price ascending", async () => {
      const { items } = await service.search({ sort: "price", pageSize: 100 });

      const prices = items.map((i) => i.askingPriceGBP);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    it("sorts by ROI descending", async () => {
      const { items } = await service.search({ sort: "roi", pageSize: 100 });

      const rois = items.map((i) => i.targetRoiPct ?? -Infinity);
      expect(rois).toEqual([...rois].sort((a, b) => b - a));
    });

    it("sorts by relevance when a query is given", async () => {
      const { items } = await service.search({
        q: "probate",
        sort: "relevance",
        pageSize: 10,
      });

      expect(items.length).toBeGreaterThan(0);
    });

    it("pages without repeating or dropping a listing", async () => {
      const all = await service.search({ sort: "price", pageSize: 100 });
      const pageSize = 5;

      const seen: string[] = [];
      for (let page = 1; page <= Math.ceil(all.total / pageSize); page++) {
        const { items } = await service.search({ sort: "price", page, pageSize });
        seen.push(...items.map((i) => i.id));
      }

      expect(seen).toHaveLength(all.total);
      expect(new Set(seen).size).toBe(all.total);
    });

    it("reports totalPages consistently with total and pageSize", async () => {
      const result = await service.search({ pageSize: 7 });

      expect(result.totalPages).toBe(Math.ceil(result.total / 7));
    });
  });

  describe("combinations", () => {
    it("ANDs filters together, narrowing at each step", async () => {
      const base: SearchParams = { pageSize: 100 };
      const all = await service.count(base);
      const priced = await service.count({ ...base, maxPriceGBP: 25_000_000 });
      const pricedAndTagged = await service.count({
        ...base,
        maxPriceGBP: 25_000_000,
        distressTags: [DistressTag.PROBATE],
      });

      expect(priced).toBeLessThanOrEqual(all);
      expect(pricedAndTagged).toBeLessThanOrEqual(priced);
    });

    it("returns rows whose every field satisfies every filter", async () => {
      const { items } = await service.search({
        maxPriceGBP: 30_000_000,
        minBedrooms: 2,
        epcBands: [EpcRating.D, EpcRating.E, EpcRating.F],
        centre: { lat: 53.4808, lng: -2.2426, radiusKm: 50 },
        sort: "price",
        pageSize: 100,
      });

      for (const item of items) {
        expect(item.askingPriceGBP).toBeLessThanOrEqual(30_000_000);
        expect(item.bedrooms).toBeGreaterThanOrEqual(2);
        expect(["D", "E", "F"]).toContain(item.epcRating);
      }
    });

    it("count agrees with the number of rows a full-page search returns", async () => {
      const params: SearchParams = {
        maxPriceGBP: 30_000_000,
        distressTags: [DistressTag.PROBATE, DistressTag.DAMP],
        pageSize: 100,
      };

      const { items, total } = await service.search(params);
      expect(items).toHaveLength(total);
      expect(await service.count(params)).toBe(total);
    });
  });

  // Sprint-plan acceptance: "p95 query < 150ms on seeded data (use EXPLAIN
  // ANALYZE sanity check)".
  describe("performance", () => {
    const heavy: SearchParams = {
      q: "probate terrace",
      maxPriceGBP: 30_000_000,
      epcBands: [EpcRating.D, EpcRating.E],
      distressTags: [DistressTag.PROBATE, DistressTag.DAMP],
      centre: { lat: 53.4808, lng: -2.2426, radiusKm: 50 },
      sort: "relevance",
      pageSize: 24,
    };

    it("keeps p95 under 150ms for the heaviest filter combination", async () => {
      const timings: number[] = [];
      for (let i = 0; i < 20; i++) {
        const started = performance.now();
        await service.search(heavy);
        timings.push(performance.now() - started);
      }
      timings.sort((a, b) => a - b);
      const p95 = timings[Math.floor(timings.length * 0.95) - 1];

      expect(p95, `p95 was ${p95.toFixed(1)}ms`).toBeLessThan(150);
    });

    it("EXPLAIN ANALYZE reports an execution time well inside the budget", async () => {
      const plan = await db.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(
        `EXPLAIN ANALYZE ${buildSearchCountQuery(heavy).text}`,
        ...buildSearchCountQuery(heavy).values,
      );
      const text = plan.map((r) => r["QUERY PLAN"]).join("\n");
      const executionMs = Number(/Execution Time: ([\d.]+) ms/.exec(text)?.[1] ?? NaN);

      expect(executionMs, `plan:\n${text}`).toBeLessThan(150);
    });
  });
});
