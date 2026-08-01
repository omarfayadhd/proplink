import { describe, expect, it } from "vitest";
import {
  assertReadyForSubmission,
  createListingSchema,
  updateListingSchema,
} from "@/services/listings/validation";
import { ListingServiceError } from "@/services/listings/errors";

const validDraft = {
  agentProfileId: "agent-profile-1",
  title: "Three-bed semi needing full refurbishment",
  description:
    "Probate sale, vacant since 2024, subsidence reported on the rear elevation.",
  addressLine1: "12 Example Road",
  city: "Manchester",
  region: "Greater Manchester",
  postcode: "M1 1AE",
  propertyType: "RESIDENTIAL",
  bedrooms: 3,
  askingPriceGBP: 15_000_00,
};

describe("createListingSchema", () => {
  it("accepts a minimal valid draft (no distress tags / EPC / images yet)", () => {
    const result = createListingSchema.safeParse(validDraft);
    expect(result.success).toBe(true);
  });

  it("rejects a non-integer askingPriceGBP (pence must be a whole number)", () => {
    const result = createListingSchema.safeParse({
      ...validDraft,
      askingPriceGBP: 100.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a zero or negative askingPriceGBP", () => {
    expect(
      createListingSchema.safeParse({ ...validDraft, askingPriceGBP: 0 }).success,
    ).toBe(false);
    expect(
      createListingSchema.safeParse({ ...validDraft, askingPriceGBP: -500 }).success,
    ).toBe(false);
  });

  it("accepts targetRoiPct at the 0 and 1000 bounds", () => {
    expect(
      createListingSchema.safeParse({ ...validDraft, targetRoiPct: 0 }).success,
    ).toBe(true);
    expect(
      createListingSchema.safeParse({ ...validDraft, targetRoiPct: 1000 }).success,
    ).toBe(true);
  });

  it("rejects targetRoiPct outside 0..1000", () => {
    expect(
      createListingSchema.safeParse({ ...validDraft, targetRoiPct: -1 }).success,
    ).toBe(false);
    expect(
      createListingSchema.safeParse({ ...validDraft, targetRoiPct: 1000.01 }).success,
    ).toBe(false);
  });

  it("rejects an invalid UK postcode", () => {
    const result = createListingSchema.safeParse({
      ...validDraft,
      postcode: "not a postcode",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown distress tag", () => {
    const result = createListingSchema.safeParse({
      ...validDraft,
      distressTags: ["HAUNTED"],
    });
    expect(result.success).toBe(false);
  });

  it("allows an empty distressTags array at draft time", () => {
    const result = createListingSchema.safeParse({ ...validDraft, distressTags: [] });
    expect(result.success).toBe(true);
  });

  it("rejects more than 20 images", () => {
    const images = Array.from({ length: 21 }, (_, i) => ({
      url: `https://example.test/${i}.jpg`,
      sortOrder: i,
    }));
    const result = createListingSchema.safeParse({ ...validDraft, images });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 20 images", () => {
    const images = Array.from({ length: 20 }, (_, i) => ({
      url: `https://example.test/${i}.jpg`,
      sortOrder: i,
    }));
    expect(createListingSchema.safeParse({ ...validDraft, images }).success).toBe(true);
  });

  it("requires agentProfileId", () => {
    const withoutProfile: Record<string, unknown> = { ...validDraft };
    delete withoutProfile.agentProfileId;
    expect(createListingSchema.safeParse(withoutProfile).success).toBe(false);
  });
});

describe("updateListingSchema", () => {
  it("accepts an empty object (no-op partial update)", () => {
    expect(updateListingSchema.safeParse({}).success).toBe(true);
  });

  it("does not accept agentProfileId — ownership cannot be reassigned via update", () => {
    const parsed = updateListingSchema.safeParse({
      agentProfileId: "someone-elses-profile",
    });
    // Either the key is stripped (parsed data has no agentProfileId) or rejected outright.
    if (parsed.success) {
      expect((parsed.data as Record<string, unknown>).agentProfileId).toBeUndefined();
    } else {
      expect(parsed.success).toBe(false);
    }
  });

  it("still validates provided fields (bad postcode rejected)", () => {
    expect(updateListingSchema.safeParse({ postcode: "nope" }).success).toBe(false);
  });
});

describe("assertReadyForSubmission", () => {
  const readyProperty = {
    distressTags: ["PROBATE" as const],
    pricingSafeguardAckAt: new Date(),
    epcRating: "D" as const,
  };

  it("does not throw when tags, safeguard ack and EPC rating are all present", () => {
    expect(() => assertReadyForSubmission(readyProperty)).not.toThrow();
  });

  it("throws VALIDATION when there are no distress tags", () => {
    try {
      assertReadyForSubmission({ ...readyProperty, distressTags: [] });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ListingServiceError);
      expect((err as ListingServiceError).code).toBe("VALIDATION");
      expect((err as ListingServiceError).message).toMatch(/distress tag/i);
    }
  });

  it("throws VALIDATION when the pricing safeguard has not been acknowledged", () => {
    try {
      assertReadyForSubmission({ ...readyProperty, pricingSafeguardAckAt: null });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ListingServiceError);
      expect((err as ListingServiceError).message).toMatch(/safeguard/i);
    }
  });

  it("throws VALIDATION when the EPC rating is missing", () => {
    try {
      assertReadyForSubmission({ ...readyProperty, epcRating: null });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ListingServiceError);
      expect((err as ListingServiceError).message).toMatch(/epc/i);
    }
  });
});
