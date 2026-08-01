import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory stand-in for Upstash so we can observe real hit/miss behaviour
// without a network dependency (src/lib/redis.ts's `cached()` is Sprint 1
// code, already covered elsewhere — this test only proves geocodePostcode
// wires the key/TTL/compute contract correctly).
const store = new Map<string, unknown>();
const cachedSpy = vi.fn(
  async (key: string, _ttlSeconds: number, compute: () => Promise<unknown>) => {
    if (store.has(key)) return store.get(key);
    const value = await compute();
    store.set(key, value);
    return value;
  },
);

vi.mock("@/lib/redis", () => ({ cached: cachedSpy }));

beforeEach(() => {
  // Fresh module graph per test — a new `geocodingService` instance each
  // time, so a `vi.spyOn` from one test can never accumulate calls seen by
  // another (`@/lib/redis`'s mock registration survives resetModules; only
  // the evaluated module cache is cleared).
  vi.resetModules();
  store.clear();
  cachedSpy.mockClear();
});

describe("geocodePostcode caching", () => {
  it("caches by NORMALISED postcode — different formatting of the same postcode is one cache entry", async () => {
    const { geocodePostcode, geocodingService } = await import("@/services/maps");
    const geocodeSpy = vi.spyOn(geocodingService, "geocode");

    const a = await geocodePostcode("SW1A 1AA");
    const b = await geocodePostcode("sw1a1aa"); // same postcode, different casing/spacing

    expect(a).toEqual(b);
    expect(geocodeSpy).toHaveBeenCalledTimes(1); // second call was a cache hit
    expect(cachedSpy).toHaveBeenCalledTimes(2);
    expect(cachedSpy.mock.calls[0][0]).toBe(cachedSpy.mock.calls[1][0]); // same cache key
  });

  it("uses a distinct cache entry (and re-geocodes) for a different postcode", async () => {
    const { geocodePostcode, geocodingService } = await import("@/services/maps");
    const geocodeSpy = vi.spyOn(geocodingService, "geocode");

    await geocodePostcode("SW1A 1AA");
    await geocodePostcode("M1 1AE");

    expect(geocodeSpy).toHaveBeenCalledTimes(2);
  });

  it("passes a cache key namespaced for geocoding and a positive TTL", async () => {
    const { geocodePostcode } = await import("@/services/maps");
    await geocodePostcode("EH1 1BB");

    const [key, ttl] = cachedSpy.mock.calls[0];
    expect(String(key)).toMatch(/geocode/i);
    expect(String(key)).toContain("EH1 1BB");
    expect(ttl).toBeGreaterThan(0);
  });
});
