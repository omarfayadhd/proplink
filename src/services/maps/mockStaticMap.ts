import type { StaticMapParams, StaticMapService } from "@/services/maps/staticMapTypes";

const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 320;

// Mirror `src/app/globals.css`'s `--color-surface`/`--color-secondary` (map)
// and `--color-body`/`--color-pale` (satellite) — these can't reference the
// CSS custom properties directly (this string is built server-side, with no
// stylesheet in scope), so the values are copied in, same exception already
// established by `EpcBadge`'s `EPC_COLOURS` in `src/components/ui/badge.tsx`
// for a generated visual asset rather than a themeable component.
const PALETTES = {
  map: { bg: "#f5f8ff", fg: "#003580" },
  satellite: { bg: "#2d3a4a", fg: "#f5f8ff" },
} as const;

/** Deterministic local SVG placeholder — no network call, no key required. */
function placeholderDataUri(
  params: StaticMapParams,
  label: string,
  palette: (typeof PALETTES)[keyof typeof PALETTES],
): string {
  const { lat, lng, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT } = params;
  const cx = width / 2;
  const cy = height / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
<rect width="100%" height="100%" fill="${palette.bg}"/>
<circle cx="${cx}" cy="${cy}" r="9" fill="${palette.fg}"/>
<circle cx="${cx}" cy="${cy}" r="9" fill="none" stroke="${palette.fg}" stroke-width="2" opacity="0.4"><animate attributeName="r" from="9" to="20" dur="1.6s" repeatCount="indefinite"/></circle>
<text x="${cx}" y="${cy + 32}" text-anchor="middle" font-family="sans-serif" font-size="14" fill="${palette.fg}">${label}</text>
<text x="${cx}" y="${cy + 52}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="${palette.fg}">${lat.toFixed(4)}, ${lng.toFixed(4)}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/**
 * Active provider while H2.2/H3.1 keys are unresolved (docs/BLOCKERS.md):
 * renders a local placeholder image (a data URI, so genuinely local — no
 * asset file, no network round trip) with a pin and the coordinates baked
 * in, so the detail page's map section always has something to render.
 */
export class MockStaticMapService implements StaticMapService {
  getMapImageUrl(params: StaticMapParams): string {
    return placeholderDataUri(params, "Map preview unavailable", PALETTES.map);
  }

  getSatelliteImageUrl(params: StaticMapParams): string {
    return placeholderDataUri(
      params,
      "Satellite preview unavailable",
      PALETTES.satellite,
    );
  }
}
