import { describe, expect, it } from "vitest";
import { normalisePostcode, isValidUkPostcode } from "@/services/maps/postcode";
import { MockGeocodingService } from "@/services/maps/mockGeocoding";

describe("normalisePostcode", () => {
  it("uppercases and collapses to a single space before the inward code", () => {
    expect(normalisePostcode("sw1a1aa")).toBe("SW1A 1AA");
    expect(normalisePostcode("  sw1a 1aa  ")).toBe("SW1A 1AA");
    expect(normalisePostcode("M1 1AE")).toBe("M1 1AE");
    expect(normalisePostcode("m11ae")).toBe("M1 1AE");
  });
});

describe("isValidUkPostcode", () => {
  it.each(["SW1A 1AA", "M1 1AE", "B33 8TH", "CR2 6XH", "DN55 1PT", "EH1 1BB"])(
    "accepts %s",
    (postcode) => {
      expect(isValidUkPostcode(postcode)).toBe(true);
    },
  );

  it.each(["not a postcode", "12345", "", "SW1A"])("rejects %s", (postcode) => {
    expect(isValidUkPostcode(postcode)).toBe(false);
  });
});

const UK_BOUNDS = { minLat: 49.8, maxLat: 61.0, minLng: -8.5, maxLng: 2.0 };

function expectWithinUk(coords: { lat: number; lng: number }) {
  expect(coords.lat).toBeGreaterThan(UK_BOUNDS.minLat);
  expect(coords.lat).toBeLessThan(UK_BOUNDS.maxLat);
  expect(coords.lng).toBeGreaterThan(UK_BOUNDS.minLng);
  expect(coords.lng).toBeLessThan(UK_BOUNDS.maxLng);
}

describe("MockGeocodingService", () => {
  const service = new MockGeocodingService();

  it("is deterministic — the same postcode always geocodes to the same point", async () => {
    const a = await service.geocode("SW1A 1AA");
    const b = await service.geocode("sw1a1aa");
    expect(a).toEqual(b);
  });

  it("gives different postcodes different coordinates", async () => {
    const a = await service.geocode("SW1A 1AA");
    const b = await service.geocode("M1 1AE");
    expect(a).not.toEqual(b);
  });

  it("always returns coordinates inside the UK bounding box", async () => {
    for (const pc of [
      "SW1A 1AA",
      "M1 1AE",
      "EH1 1BB",
      "CF10 1AA",
      "not-a-real-postcode",
    ]) {
      expectWithinUk(await service.geocode(pc));
    }
  });

  it("places a Manchester (M) postcode near Manchester, not London", async () => {
    const manchester = await service.geocode("M1 1AE");
    const london = await service.geocode("SW1A 1AA");
    // Manchester is north and west of London — a coarse but effective distinguisher.
    expect(manchester.lat).toBeGreaterThan(london.lat);
  });

  it("falls back to a London-ish default for an unrecognised prefix", async () => {
    const unknown = await service.geocode("ZZ9 9ZZ");
    expect(unknown.lat).toBeCloseTo(51.5, 0);
    expect(unknown.lng).toBeCloseTo(-0.1, 0);
  });
});
