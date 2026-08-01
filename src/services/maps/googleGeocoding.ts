import type { GeocodeResult, GeocodingService } from "@/services/maps/types";

interface GoogleGeocodeResponse {
  status: string;
  error_message?: string;
  results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
}

/**
 * Real Google Geocoding API provider — selected once `GOOGLE_MAPS_SERVER_KEY`
 * is set (H2.2, docs/BLOCKERS.md). Never used in tests; `src/services/maps`
 * only wires it up, it isn't exercised (AGENTS.md: external providers via
 * interfaces + mocks, tests never hit live APIs).
 */
export class GoogleGeocodingService implements GeocodingService {
  constructor(private readonly apiKey: string) {}

  async geocode(postcode: string): Promise<GeocodeResult> {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", `${postcode}, UK`);
    url.searchParams.set("region", "uk");
    url.searchParams.set("key", this.apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Google Geocoding API request failed: HTTP ${res.status}`);
    }

    const data = (await res.json()) as GoogleGeocodeResponse;
    if (data.status !== "OK" || data.results.length === 0) {
      throw new Error(
        `Google Geocoding API could not resolve "${postcode}": ${data.status}${
          data.error_message ? ` — ${data.error_message}` : ""
        }`,
      );
    }

    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  }
}
