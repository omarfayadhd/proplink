import { cached } from "@/lib/redis";
import { GoogleGeocodingService } from "@/services/maps/googleGeocoding";
import { MockGeocodingService } from "@/services/maps/mockGeocoding";
import { normalisePostcode } from "@/services/maps/postcode";
import type { GeocodeResult, GeocodingService } from "@/services/maps/types";

export type { GeocodeResult, GeocodingService } from "@/services/maps/types";
export { MockGeocodingService } from "@/services/maps/mockGeocoding";
export { GoogleGeocodingService } from "@/services/maps/googleGeocoding";
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
