import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/search", async (importOriginal) => ({
  // Keep the real `parseSearchParams` so these tests exercise the route's
  // actual URL → params path; only the DB-backed service is stubbed.
  ...(await importOriginal<typeof import("@/services/search")>()),
  searchService: { search: vi.fn(), count: vi.fn() },
}));

import { searchService } from "@/services/search";
import { GET as SEARCH } from "@/app/api/search/route";
import { GET as COUNT } from "@/app/api/search/count/route";

const mockSearch = vi.mocked(searchService.search);
const mockCount = vi.mocked(searchService.count);

beforeEach(() => vi.clearAllMocks());

const request = (qs: string) => new Request(`http://localhost/api/search?${qs}`);

const emptyResult = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 24,
  totalPages: 0,
};

describe("GET /api/search", () => {
  // The marketplace is the shop window — requiring a session to browse would
  // defeat the point, and every other public read in this codebase is open.
  it("is public — no session required", async () => {
    mockSearch.mockResolvedValue(emptyResult);

    const res = await SEARCH(request(""));

    expect(res.status).toBe(200);
  });

  it("returns the result envelope the UI paginates against", async () => {
    mockSearch.mockResolvedValue({ ...emptyResult, total: 41, totalPages: 2 });

    const body = await (await SEARCH(request(""))).json();

    expect(body).toMatchObject({ total: 41, page: 1, pageSize: 24, totalPages: 2 });
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("passes parsed filters through to the service", async () => {
    mockSearch.mockResolvedValue(emptyResult);

    await SEARCH(
      request("q=probate&maxPrice=250000&tags=PROBATE,DAMP&sort=price&page=2"),
    );

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "probate",
        maxPriceGBP: 25_000_000,
        distressTags: ["PROBATE", "DAMP"],
        sort: "price",
        page: 2,
      }),
    );
  });

  // A stale or hand-edited shared link must still return results.
  it("ignores malformed filters rather than erroring", async () => {
    mockSearch.mockResolvedValue(emptyResult);

    const res = await SEARCH(request("epc=NONSENSE&beds=lots&bbox=1,2,3"));

    expect(res.status).toBe(200);
    expect(mockSearch).toHaveBeenCalledWith({});
  });
});

describe("GET /api/search/count", () => {
  it("returns just the count, for the debounced live counter", async () => {
    mockCount.mockResolvedValue(17);

    const res = await COUNT(request("minRoi=12"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ count: 17 });
  });

  // The whole point of a separate endpoint: the filter sidebar updates its
  // "N properties" label on every keystroke and must not pull 24 rows to do it.
  it("does not run the rows query", async () => {
    mockCount.mockResolvedValue(3);

    await COUNT(request(""));

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("applies the same filter parsing as the results endpoint", async () => {
    mockCount.mockResolvedValue(0);

    await COUNT(request("epc=A,B&lat=53.48&lng=-2.24&radiusKm=5"));

    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({
        epcBands: ["A", "B"],
        centre: { lat: 53.48, lng: -2.24, radiusKm: 5 },
      }),
    );
  });
});
