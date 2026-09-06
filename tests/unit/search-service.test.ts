import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: { $queryRaw: vi.fn() } }));

import { db } from "@/lib/db";
import { PostgresSearchService } from "@/services/search/postgresSearchService";

const mockDb = vi.mocked(db, true);

beforeEach(() => vi.clearAllMocks());

const service = new PostgresSearchService();

function rawRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "seed-listing-01",
    title: "Probate sale — three-bed semi",
    city: "London",
    region: "Greater London",
    postcode: "E1 6AN",
    propertyType: "RESIDENTIAL",
    bedrooms: 3,
    askingPriceGBP: 4_500_000,
    targetRoiPct: 8,
    epcRating: "D",
    status: "LIVE",
    publishedAt: new Date("2026-08-07T00:00:00Z"),
    lat: 51.5074,
    lng: -0.1278,
    imageUrl: "/uploads/seed/plate-01.svg",
    distressTags: ["PROBATE"],
    ...overrides,
  };
}

/** `search()` issues the rows query and the count query; mock both in order. */
function mockQueries(rows: unknown[], total: number) {
  mockDb.$queryRaw
    .mockResolvedValueOnce(rows as never)
    .mockResolvedValueOnce([{ count: total }] as never);
}

describe("PostgresSearchService.search", () => {
  it("maps raw rows onto SearchResultItems", async () => {
    mockQueries([rawRow()], 1);

    const result = await service.search({});

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "seed-listing-01",
      askingPriceGBP: 4_500_000,
      epcRating: "D",
      imageUrl: "/uploads/seed/plate-01.svg",
      distressTags: ["PROBATE"],
      lat: 51.5074,
    });
  });

  it("returns an empty result set without throwing", async () => {
    mockQueries([], 0);

    const result = await service.search({ q: "nothing matches this" });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  // A listing with no photos yet is normal (the wizard allows saving a draft
  // before the media step), and the card renders a placeholder.
  it("tolerates a listing with no image and no tags", async () => {
    mockQueries([rawRow({ imageUrl: null, distressTags: [] })], 1);

    const result = await service.search({});

    expect(result.items[0].imageUrl).toBeNull();
    expect(result.items[0].distressTags).toEqual([]);
  });

  it("reports the resolved page and page size, not the raw request", async () => {
    mockQueries([], 0);

    // Page 0 is not a real page and 5000 is over the cap — the result must
    // describe what was actually queried, or the UI paginates against a lie.
    const result = await service.search({ page: 0, pageSize: 5000 });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBeLessThanOrEqual(100);
  });

  it("computes totalPages by rounding up", async () => {
    mockQueries([], 41);

    const result = await service.search({ pageSize: 20 });

    expect(result.total).toBe(41);
    expect(result.totalPages).toBe(3);
  });

  it("runs the rows and count queries against the database", async () => {
    mockQueries([rawRow()], 1);

    await service.search({ maxPriceGBP: 10_000_000 });

    expect(mockDb.$queryRaw).toHaveBeenCalledTimes(2);
  });
});

describe("PostgresSearchService.count", () => {
  it("returns the count without fetching any rows", async () => {
    mockDb.$queryRaw.mockResolvedValue([{ count: 17 }] as never);

    const total = await service.count({ minRoiPct: 12 });

    expect(total).toBe(17);
    expect(mockDb.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("returns 0 when the count query somehow yields no row", async () => {
    mockDb.$queryRaw.mockResolvedValue([] as never);

    expect(await service.count({})).toBe(0);
  });
});
