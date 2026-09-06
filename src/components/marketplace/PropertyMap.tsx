"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export interface PropertyMapProps {
  mapImageUrl: string;
  satelliteImageUrl: string;
  /** Used to build a descriptive alt text, e.g. "12 Example Road, Manchester". */
  addressLabel: string;
}

type MapView = "map" | "satellite";

const VIEWS: { id: MapView; label: string }[] = [
  { id: "map", label: "Map" },
  { id: "satellite", label: "Satellite" },
];

/**
 * Static map pin + satellite view toggle (Task 2.5 brief) — both images come
 * from `StaticMapService` (mock while H2.2/H3.1 are unresolved), so this
 * component only ever swaps which pre-built `<img src>` is shown. Toggle
 * buttons use `role="tablist"`/`role="tab"` — same keyboard-accessible native
 * `<button>` pattern as `PropertyGallery`.
 */
export function PropertyMap({
  mapImageUrl,
  satelliteImageUrl,
  addressLabel,
}: PropertyMapProps) {
  const [view, setView] = useState<MapView>("map");
  const src = view === "map" ? mapImageUrl : satelliteImageUrl;
  const viewLabel = VIEWS.find((v) => v.id === view)?.label ?? "Map";

  return (
    <div>
      <div
        className="mb-2 inline-flex rounded-md border border-line bg-white p-1"
        role="tablist"
        aria-label="Map view"
      >
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={cn(
              "rounded px-3 py-1 text-sm font-medium",
              view === v.id ? "bg-accent text-white" : "text-secondary hover:bg-pale",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- data: URI (mock) or an unlisted external host (Google Static Maps); next/image can't optimise either. */}
      <img
        src={src}
        alt={`${viewLabel} view of ${addressLabel}`}
        data-testid="property-map-image"
        className="w-full rounded-lg border border-line"
        width={640}
        height={320}
      />
    </div>
  );
}
