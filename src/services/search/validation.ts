import { DistressTag, EpcRating, PropertyType } from "@/generated/prisma/enums";
import type {
  SearchBbox,
  SearchCentre,
  SearchParams,
  SearchSort,
} from "@/services/search/types";

/**
 * URL query string → `SearchParams`, for both `GET /api/search` and Task 3.2's
 * `/marketplace` page (whose entire state lives in the query string, so a
 * search is shareable).
 *
 * **Everything malformed is dropped, never rejected.** A hand-edited or stale
 * shared link should degrade to a broader search, not a 500 — and certainly not
 * to a silently wrong filter. Zod is used elsewhere for request *bodies*, where
 * a 400 is the right answer; a URL that a user can mangle by deleting a
 * character is a different contract.
 */

const SORTS: SearchSort[] = ["newest", "price", "roi", "relevance"];

/** Beyond this, "nearby" stops meaning anything — and the query stops using the index well. */
const MAX_RADIUS_KM = 500;

function positiveNumber(raw: string | null): number | undefined {
  if (raw == null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function positiveInt(raw: string | null): number | undefined {
  const n = positiveNumber(raw);
  return n == null ? undefined : Math.floor(n);
}

function finiteNumber(raw: string | null): number | undefined {
  if (raw == null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

const isLat = (n: number) => n >= -90 && n <= 90;
const isLng = (n: number) => n >= -180 && n <= 180;

/** Comma-separated list → only the values that are real enum members. */
function enumList<T extends string>(
  raw: string | null,
  allowed: Record<string, T>,
): T[] | undefined {
  if (!raw) return undefined;
  const valid = Object.values(allowed);
  const parsed = raw
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter((v): v is T => (valid as string[]).includes(v));
  return parsed.length ? parsed : undefined;
}

function parseBbox(raw: string | null): SearchBbox | undefined {
  if (!raw) return undefined;
  // west,south,east,north — the order GeoJSON and Leaflet both use.
  const parts = raw.split(",").map((v) => Number(v.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return undefined;

  const [minLng, minLat, maxLng, maxLat] = parts;
  if (![minLat, maxLat].every(isLat) || ![minLng, maxLng].every(isLng)) return undefined;

  return { minLng, minLat, maxLng, maxLat };
}

function parseCentre(sp: URLSearchParams): SearchCentre | undefined {
  const lat = finiteNumber(sp.get("lat"));
  const lng = finiteNumber(sp.get("lng"));
  const radiusKm = finiteNumber(sp.get("radiusKm"));

  // All three or none — a centre without a radius has no meaning, and guessing
  // a default radius would quietly change what the link searched for.
  if (lat == null || lng == null || radiusKm == null) return undefined;
  if (!isLat(lat) || !isLng(lng)) return undefined;
  if (radiusKm <= 0 || radiusKm > MAX_RADIUS_KM) return undefined;

  return { lat, lng, radiusKm };
}

export function parseSearchParams(sp: URLSearchParams): SearchParams {
  const params: SearchParams = {};

  const q = sp.get("q")?.trim();
  if (q) params.q = q;

  // The URL carries pounds so a shared link reads naturally; pence is internal.
  const maxPricePounds = positiveNumber(sp.get("maxPrice"));
  if (maxPricePounds != null) params.maxPriceGBP = Math.round(maxPricePounds * 100);

  const epcBands = enumList(sp.get("epc"), EpcRating);
  if (epcBands) params.epcBands = epcBands;

  const distressTags = enumList(sp.get("tags"), DistressTag);
  if (distressTags) params.distressTags = distressTags;

  const region = sp.get("region")?.trim();
  if (region) params.region = region;

  const type = sp.get("type")?.trim().toUpperCase();
  if (type && (Object.values(PropertyType) as string[]).includes(type)) {
    params.propertyType = type as PropertyType;
  }

  const minBedrooms = positiveInt(sp.get("beds"));
  if (minBedrooms != null) params.minBedrooms = minBedrooms;

  const minRoiPct = positiveNumber(sp.get("roi"));
  if (minRoiPct != null) params.minRoiPct = minRoiPct;

  const bbox = parseBbox(sp.get("bbox"));
  if (bbox) params.bbox = bbox;

  const centre = parseCentre(sp);
  if (centre) params.centre = centre;

  const sort = sp.get("sort")?.trim() as SearchSort | undefined;
  if (sort && SORTS.includes(sort)) params.sort = sort;

  const page = positiveInt(sp.get("page"));
  if (page != null) params.page = page;

  const pageSize = positiveInt(sp.get("pageSize"));
  if (pageSize != null) params.pageSize = pageSize;

  return params;
}
