import { describe, expect, it } from "vitest";
import { GoogleStaticMapService } from "@/services/maps/googleStaticMap";
import { MockStaticMapService } from "@/services/maps/mockStaticMap";

const COORDS = { lat: 53.4808, lng: -2.2426 };

describe("GoogleStaticMapService", () => {
  const service = new GoogleStaticMapService("test-key");

  it("builds a roadmap Static Maps URL with the centre, key and a red marker", () => {
    const url = new URL(service.getMapImageUrl(COORDS));
    expect(url.origin + url.pathname).toBe(
      "https://maps.googleapis.com/maps/api/staticmap",
    );
    expect(url.searchParams.get("center")).toBe("53.4808,-2.2426");
    expect(url.searchParams.get("maptype")).toBe("roadmap");
    expect(url.searchParams.get("key")).toBe("test-key");
    expect(url.searchParams.get("markers")).toContain("53.4808,-2.2426");
  });

  it("builds a satellite Static Maps URL, no marker", () => {
    const url = new URL(service.getSatelliteImageUrl(COORDS));
    expect(url.searchParams.get("maptype")).toBe("satellite");
    expect(url.searchParams.get("markers")).toBeNull();
  });

  it("respects custom width/height/zoom", () => {
    const url = new URL(
      service.getMapImageUrl({ ...COORDS, width: 800, height: 400, zoom: 17 }),
    );
    expect(url.searchParams.get("size")).toBe("800x400");
    expect(url.searchParams.get("zoom")).toBe("17");
  });
});

describe("MockStaticMapService (active while H2.2/H3.1 keys are absent)", () => {
  const service = new MockStaticMapService();

  it("returns a local data: URI — no network call, no key required", () => {
    const url = service.getMapImageUrl(COORDS);
    expect(url.startsWith("data:image/svg+xml;base64,")).toBe(true);
  });

  it("returns a distinct image for the satellite view vs. the roadmap view", () => {
    const map = service.getMapImageUrl(COORDS);
    const satellite = service.getSatelliteImageUrl(COORDS);
    expect(map).not.toBe(satellite);
  });

  it("is deterministic for the same coordinates", () => {
    const a = service.getMapImageUrl(COORDS);
    const b = service.getMapImageUrl(COORDS);
    expect(a).toBe(b);
  });

  it("encodes the lat/lng into the placeholder image", () => {
    const svg = Buffer.from(
      service.getMapImageUrl(COORDS).replace("data:image/svg+xml;base64,", ""),
      "base64",
    ).toString("utf-8");
    expect(svg).toContain("53.4808");
    expect(svg).toContain("-2.2426");
  });
});
