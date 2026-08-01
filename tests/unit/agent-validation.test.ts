import { describe, expect, it } from "vitest";
import {
  MAX_CASE_STUDY_MONEY_PENCE,
  createAppraisalSchema,
  createCaseStudySchema,
  updateCaseStudySchema,
} from "@/services/agents/validation";

const validCaseStudy = {
  agentProfileId: "profile-1",
  title: "Probate semi, full strip-out refurb",
  capexGBP: 45_000_00,
  netMarginGBP: 22_000_00,
  description: "Bought at auction, gutted and re-wired, sold within 4 months.",
};

describe("createCaseStudySchema", () => {
  it("accepts a valid case study", () => {
    expect(createCaseStudySchema.safeParse(validCaseStudy).success).toBe(true);
  });

  it("requires agentProfileId", () => {
    const withoutProfile: Record<string, unknown> = { ...validCaseStudy };
    delete withoutProfile.agentProfileId;
    expect(createCaseStudySchema.safeParse(withoutProfile).success).toBe(false);
  });

  it("rejects a negative capexGBP (a cost cannot be negative)", () => {
    expect(
      createCaseStudySchema.safeParse({ ...validCaseStudy, capexGBP: -100 }).success,
    ).toBe(false);
  });

  it("rejects a non-integer capexGBP or netMarginGBP (money must be integer pence)", () => {
    expect(
      createCaseStudySchema.safeParse({ ...validCaseStudy, capexGBP: 100.5 }).success,
    ).toBe(false);
    expect(
      createCaseStudySchema.safeParse({ ...validCaseStudy, netMarginGBP: 100.5 }).success,
    ).toBe(false);
  });

  it("allows a negative netMarginGBP (a case study can honestly report a loss)", () => {
    expect(
      createCaseStudySchema.safeParse({ ...validCaseStudy, netMarginGBP: -5_000_00 })
        .success,
    ).toBe(true);
  });

  it("rejects amounts beyond the sanity ceiling", () => {
    expect(
      createCaseStudySchema.safeParse({
        ...validCaseStudy,
        capexGBP: MAX_CASE_STUDY_MONEY_PENCE + 1,
      }).success,
    ).toBe(false);
  });

  it("rejects a title that is too short", () => {
    expect(
      createCaseStudySchema.safeParse({ ...validCaseStudy, title: "Hi" }).success,
    ).toBe(false);
  });

  it("rejects an invalid imageUrl but allows it to be omitted", () => {
    expect(
      createCaseStudySchema.safeParse({ ...validCaseStudy, imageUrl: "not-a-url" })
        .success,
    ).toBe(false);
    expect(createCaseStudySchema.safeParse(validCaseStudy).success).toBe(true);
  });
});

describe("updateCaseStudySchema", () => {
  it("accepts a partial update with a single field", () => {
    expect(updateCaseStudySchema.safeParse({ capexGBP: 10_000_00 }).success).toBe(true);
  });

  it("accepts an empty object (no-op update)", () => {
    expect(updateCaseStudySchema.safeParse({}).success).toBe(true);
  });

  it("does not accept agentProfileId (ownership is not reassignable via update)", () => {
    const result = updateCaseStudySchema.safeParse({ agentProfileId: "other-profile" });
    // Extra/unknown keys are simply stripped by default Zod object parsing —
    // assert the parsed value carries no agentProfileId through, rather than
    // asserting failure (that would only hold if this ever adopts .strict()).
    expect(result.success && "agentProfileId" in result.data).toBe(false);
  });
});

describe("createAppraisalSchema", () => {
  const valid = { rating: 4, review: "Responsive, kept us updated at every stage." };

  it("accepts a valid appraisal", () => {
    expect(createAppraisalSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a rating outside 1..5", () => {
    expect(createAppraisalSchema.safeParse({ ...valid, rating: 0 }).success).toBe(false);
    expect(createAppraisalSchema.safeParse({ ...valid, rating: 6 }).success).toBe(false);
  });

  it("rejects a non-integer rating", () => {
    expect(createAppraisalSchema.safeParse({ ...valid, rating: 3.5 }).success).toBe(
      false,
    );
  });

  it("rejects a review that is too short", () => {
    expect(createAppraisalSchema.safeParse({ ...valid, review: "Good" }).success).toBe(
      false,
    );
  });
});
