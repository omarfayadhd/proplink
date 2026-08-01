import { normalisePostcode } from "@/services/maps/postcode";
import type { GeocodeResult, GeocodingService } from "@/services/maps/types";

// Approximate centre points for common UK postcode-area prefixes, used only
// to make the mock's output "look" like a real UK geography. Longest-match
// wins (checked before the single-letter fallback) so e.g. "EH" (Edinburgh)
// is not shadowed by "E" (London).
const AREA_COORDS: Record<string, GeocodeResult> = {
  // Greater London prefixes
  E: { lat: 51.5074, lng: -0.1278 },
  EC: { lat: 51.5155, lng: -0.0922 },
  N: { lat: 51.5588, lng: -0.1092 },
  NW: { lat: 51.5445, lng: -0.1747 },
  SE: { lat: 51.4732, lng: -0.0658 },
  SW: { lat: 51.4875, lng: -0.1687 },
  W: { lat: 51.5117, lng: -0.1957 },
  WC: { lat: 51.5155, lng: -0.126 },
  // Other major cities
  B: { lat: 52.4862, lng: -1.8904 },
  M: { lat: 53.4808, lng: -2.2426 },
  LS: { lat: 53.8008, lng: -1.5491 },
  BS: { lat: 51.4545, lng: -2.5879 },
  G: { lat: 55.8642, lng: -4.2518 },
  EH: { lat: 55.9533, lng: -3.1883 },
  L: { lat: 53.4084, lng: -2.9916 },
  NE: { lat: 54.9783, lng: -1.6178 },
  S: { lat: 53.3811, lng: -1.4701 },
  CF: { lat: 51.4816, lng: -3.1791 },
  NG: { lat: 52.9548, lng: -1.1581 },
  OX: { lat: 51.752, lng: -1.2577 },
  CB: { lat: 52.2053, lng: 0.1218 },
};

const LONDON_DEFAULT: GeocodeResult = { lat: 51.5074, lng: -0.1278 };

// Max jitter around the area centre, in degrees (~±6km at UK latitudes) —
// keeps mock points spread out but geographically plausible.
const JITTER_DEGREES = 0.06;

const UK_BOUNDS = { minLat: 49.9, maxLat: 60.9, minLng: -8.2, maxLng: 1.8 };

/** Simple deterministic string hash (djb2-ish); wraps as a 32-bit int. */
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0; // unsigned
}

/** Maps a hash to a [-1, 1] float. */
function hashToUnitRange(hash: number): number {
  return (hash % 2_000_003) / 1_000_001.5 - 1;
}

function areaPrefix(normalised: string): string {
  const match = /^[A-Z]+/.exec(normalised);
  return match ? match[0] : "";
}

function baseCoordsForPostcode(normalised: string): GeocodeResult {
  const prefix = areaPrefix(normalised);
  return AREA_COORDS[prefix] ?? AREA_COORDS[prefix.slice(0, 1)] ?? LONDON_DEFAULT;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Deterministic mock geocoder (active while H2.2 is unresolved —
 * docs/BLOCKERS.md): derives a realistic-looking UK lat/lng from the
 * postcode string alone, no network call. The same postcode always resolves
 * to the same point; different postcodes resolve to different points,
 * clustered near the right city when the prefix is recognised and defaulting
 * near London otherwise.
 */
export class MockGeocodingService implements GeocodingService {
  async geocode(postcode: string): Promise<GeocodeResult> {
    const normalised = normalisePostcode(postcode);
    const base = baseCoordsForPostcode(normalised);
    const latJitter = hashToUnitRange(hashString(normalised)) * JITTER_DEGREES;
    const lngJitter = hashToUnitRange(hashString(`${normalised}#lng`)) * JITTER_DEGREES;

    return {
      lat: clamp(base.lat + latJitter, UK_BOUNDS.minLat, UK_BOUNDS.maxLat),
      lng: clamp(base.lng + lngJitter, UK_BOUNDS.minLng, UK_BOUNDS.maxLng),
    };
  }
}
