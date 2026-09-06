import type { StaticMapParams, StaticMapService } from "@/services/maps/staticMapTypes";

const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 320;
const DEFAULT_ZOOM = 15;

function buildUrl(
  params: StaticMapParams,
  apiKey: string,
  mapType: "roadmap" | "satellite",
): string {
  const {
    lat,
    lng,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    zoom = DEFAULT_ZOOM,
  } = params;
  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("center", `${lat},${lng}`);
  url.searchParams.set("zoom", String(zoom));
  url.searchParams.set("size", `${width}x${height}`);
  url.searchParams.set("maptype", mapType);
  // A pin only makes sense on the roadmap view — the satellite image already
  // shows the plot itself at this zoom, and a marker icon would obscure it.
  if (mapType === "roadmap") {
    url.searchParams.set("markers", `color:red|${lat},${lng}`);
  }
  url.searchParams.set("key", apiKey);
  return url.toString();
}

/**
 * Real Google Static Maps API provider — selected once `GOOGLE_MAPS_API_KEY`
 * is set (H2.2/H3.1, docs/BLOCKERS.md). Never used in tests; `src/services/maps`
 * only wires it up, it isn't exercised (AGENTS.md: external providers via
 * interfaces + mocks, tests never hit live APIs).
 */
export class GoogleStaticMapService implements StaticMapService {
  constructor(private readonly apiKey: string) {}

  getMapImageUrl(params: StaticMapParams): string {
    return buildUrl(params, this.apiKey, "roadmap");
  }

  getSatelliteImageUrl(params: StaticMapParams): string {
    return buildUrl(params, this.apiKey, "satellite");
  }
}
