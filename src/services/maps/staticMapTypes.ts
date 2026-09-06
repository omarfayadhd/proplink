export interface StaticMapParams {
  lat: number;
  lng: number;
  width?: number;
  height?: number;
  zoom?: number;
}

/**
 * Static map image provider — Task 2.5's public property detail page uses
 * this for the "static map pin + satellite view" section instead of loading
 * the full interactive Maps JS SDK. Selection lives in `./index.ts`, driven
 * by `GOOGLE_MAPS_API_KEY` presence (H2.2/H3.1, docs/BLOCKERS.md) — the
 * *browser*-restricted key (`.env.example`'s "referrer-restricted" key), not
 * the server one `GeocodingService` uses, because the URL these methods
 * return is embedded directly in an `<img src>` and rendered by the visitor's
 * browser. No caching layer here (unlike `geocodePostcode`): building the URL
 * makes no fetch call from our server at all — the only network request is
 * the browser's own image load — so AGENTS.md's "cache before you call"
 * doesn't apply.
 */
export interface StaticMapService {
  getMapImageUrl(params: StaticMapParams): string;
  getSatelliteImageUrl(params: StaticMapParams): string;
}
