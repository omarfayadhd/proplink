export interface GeocodeResult {
  lat: number;
  lng: number;
}

/**
 * Geocoding provider interface — selection lives in `./index.ts`, driven by
 * `GOOGLE_MAPS_SERVER_KEY` presence (H2.2, docs/BLOCKERS.md). Tests only ever
 * exercise `MockGeocodingService` (AGENTS.md: external providers via
 * interfaces + mocks, tests never hit live APIs).
 */
export interface GeocodingService {
  geocode(postcode: string): Promise<GeocodeResult>;
}
