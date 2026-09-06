import type { SearchParams } from "@/services/search/types";

/**
 * `SearchParams` → URL query string: the exact inverse of `parseSearchParams`.
 *
 * `/marketplace` keeps its entire state in the URL so a search is shareable and
 * back/forward work, which means this and the parser have to agree on every
 * key, unit and separator. They are tested as a round trip, not just
 * field-by-field, because agreeing on nine keys individually and still losing a
 * search between them is exactly the failure mode.
 *
 * Defaults and empty values are omitted, so the same search always produces the
 * same URL — two spellings of one search would split caches and analytics, and
 * a link full of `epc=&q=` reads like a bug.
 */
export function buildSearchQueryString(params: SearchParams): string {
  const sp = new URLSearchParams();

  const q = params.q?.trim();
  if (q) sp.set("q", q);

  // Pence in, pounds out — the parser converts back, and a shared link should
  // read as £250,000 rather than 25000000.
  if (params.maxPriceGBP != null) sp.set("maxPrice", String(params.maxPriceGBP / 100));

  if (params.epcBands?.length) sp.set("epc", params.epcBands.join(","));
  if (params.distressTags?.length) sp.set("tags", params.distressTags.join(","));

  const region = params.region?.trim();
  if (region) sp.set("region", region);
  if (params.propertyType) sp.set("type", params.propertyType);
  if (params.minBedrooms != null) sp.set("beds", String(params.minBedrooms));
  if (params.minRoiPct != null) sp.set("roi", String(params.minRoiPct));

  // Mirrors the query builder's precedence: bbox wins, so the URL must not
  // carry a stale centre next to it.
  if (params.bbox) {
    const { minLng, minLat, maxLng, maxLat } = params.bbox;
    sp.set("bbox", [minLng, minLat, maxLng, maxLat].join(","));
  } else if (params.centre) {
    sp.set("lat", String(params.centre.lat));
    sp.set("lng", String(params.centre.lng));
    sp.set("radiusKm", String(params.centre.radiusKm));
  }

  // "newest" and page 1 are the defaults — emitting them would give one search
  // two URLs.
  if (params.sort && params.sort !== "newest") sp.set("sort", params.sort);
  if (params.page != null && params.page > 1) sp.set("page", String(params.page));
  if (params.pageSize != null) sp.set("pageSize", String(params.pageSize));

  return sp.toString();
}
