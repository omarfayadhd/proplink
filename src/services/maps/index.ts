import { cached } from "@/lib/redis";
import { GoogleGeocodingService } from "@/services/maps/googleGeocoding";
import { MockGeocodingService } from "@/services/maps/mockGeocoding";
import { GoogleStaticMapService } from "@/services/maps/googleStaticMap";
import { MockStaticMapService } from "@/services/maps/mockStaticMap";
import { normalisePostcode } from "@/services/maps/postcode";
import type { GeocodeResult, GeocodingService } from "@/services/maps/types";
import type { StaticMapService } from "@/services/maps/staticMapTypes";

export type { GeocodeResult, GeocodingService } from "@/services/maps/types";
export type { StaticMapParams, StaticMapService } from "@/services/maps/staticMapTypes";
export { MockGeocodingService } from "@/services/maps/mockGeocoding";
export { GoogleGeocodingService } from "@/services/maps/googleGeocoding";
export { MockStaticMapService } from "@/services/maps/mockStaticMap";
export { GoogleStaticMapService } from "@/services/maps/googleStaticMap";
export { normalisePostcode, isValidUkPostcode } from "@/services/maps/postcode";

// Postcodes don't move — cache generously (30 days).
const GEOCODE_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

// GOOGLE_MAPS_SERVER_KEY=|H2.2, docs/BLOCKERS.md. Absent locally -> mock is
// the active provider; tests only ever exercise MockGeocodingService.
function createGeocodingService(): GeocodingService {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  return key ? new GoogleGeocodingService(key) : new MockGeocodingService();
}

export const geocodingService: GeocodingService = createGeocodingService();

/** Redis-cached (cache-first, per AGENTS.md), keyed by normalised postcode. */
export async function geocodePostcode(postcode: string): Promise<GeocodeResult> {
  const normalised = normalisePostcode(postcode);
  return cached(`geocode:uk:${normalised}`, GEOCODE_CACHE_TTL_SECONDS, () =>
    geocodingService.geocode(normalised),
  );
}

// GOOGLE_MAPS_API_KEY=|H2.2/H3.1, docs/BLOCKERS.md. The *browser*-restricted
// key (see staticMapTypes.ts) — absent locally -> mock is the active
// provider, same "tests only ever exercise the mock" rule as geocoding.
function createStaticMapService(): StaticMapService {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  return key ? new GoogleStaticMapService(key) : new MockStaticMapService();
}

export const staticMapService: StaticMapService = createStaticMapService();
