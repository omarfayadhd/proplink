import { describe, expect, it } from "vitest";
import {
  assertListingTransition,
  canTransitionListingStatus,
} from "@/services/listings/statusMachine";
import { ListingServiceError } from "@/services/listings/errors";
import { PropertyStatus, Role } from "@/generated/prisma/enums";

describe("canTransitionListingStatus", () => {
  it("allows an agent to submit a draft for review", () => {
    expect(
      canTransitionListingStatus(
        PropertyStatus.DRAFT,
        PropertyStatus.PENDING_REVIEW,
        Role.AGENT,
      ),
    ).toBe(true);
  });

  it("allows an admin to approve a pending listing to LIVE", () => {
    expect(
      canTransitionListingStatus(
        PropertyStatus.PENDING_REVIEW,
        PropertyStatus.LIVE,
        Role.ADMIN,
      ),
    ).toBe(true);
  });

  it("does NOT allow an agent to approve a pending listing to LIVE", () => {
    expect(
      canTransitionListingStatus(
        PropertyStatus.PENDING_REVIEW,
        PropertyStatus.LIVE,
        Role.AGENT,
      ),
    ).toBe(false);
  });

  it("allows an agent to move LIVE -> UNDER_OFFER -> SOLD", () => {
    expect(
      canTransitionListingStatus(
        PropertyStatus.LIVE,
        PropertyStatus.UNDER_OFFER,
        Role.AGENT,
      ),
    ).toBe(true);
    expect(
      canTransitionListingStatus(
        PropertyStatus.UNDER_OFFER,
        PropertyStatus.SOLD,
        Role.AGENT,
      ),
    ).toBe(true);
  });

  it("does not allow skipping PENDING_REVIEW (DRAFT -> LIVE)", () => {
    expect(
      canTransitionListingStatus(PropertyStatus.DRAFT, PropertyStatus.LIVE, Role.ADMIN),
    ).toBe(false);
  });

  it("does not allow skipping UNDER_OFFER (LIVE -> SOLD)", () => {
    expect(
      canTransitionListingStatus(PropertyStatus.LIVE, PropertyStatus.SOLD, Role.AGENT),
    ).toBe(false);
  });

  it("does not allow any transition out of SOLD (terminal state)", () => {
    for (const to of Object.values(PropertyStatus)) {
      expect(canTransitionListingStatus(PropertyStatus.SOLD, to, Role.ADMIN)).toBe(false);
    }
  });

  it("does not allow reverse transitions", () => {
    expect(
      canTransitionListingStatus(
        PropertyStatus.LIVE,
        PropertyStatus.PENDING_REVIEW,
        Role.ADMIN,
      ),
    ).toBe(false);
    expect(
      canTransitionListingStatus(
        PropertyStatus.UNDER_OFFER,
        PropertyStatus.LIVE,
        Role.AGENT,
      ),
    ).toBe(false);
  });

  it("allows an admin to reject a pending listing back to DRAFT (Task 2.3)", () => {
    expect(
      canTransitionListingStatus(
        PropertyStatus.PENDING_REVIEW,
        PropertyStatus.DRAFT,
        Role.ADMIN,
      ),
    ).toBe(true);
  });

  it("does NOT allow an agent to reject a pending listing back to DRAFT", () => {
    expect(
      canTransitionListingStatus(
        PropertyStatus.PENDING_REVIEW,
        PropertyStatus.DRAFT,
        Role.AGENT,
      ),
    ).toBe(false);
  });

  it("no role (BUYER/INVESTOR) can drive any listing transition", () => {
    expect(
      canTransitionListingStatus(
        PropertyStatus.DRAFT,
        PropertyStatus.PENDING_REVIEW,
        Role.BUYER,
      ),
    ).toBe(false);
    expect(
      canTransitionListingStatus(
        PropertyStatus.PENDING_REVIEW,
        PropertyStatus.LIVE,
        Role.INVESTOR,
      ),
    ).toBe(false);
  });
});

describe("assertListingTransition", () => {
  it("does not throw for a legal transition", () => {
    expect(() =>
      assertListingTransition(
        PropertyStatus.DRAFT,
        PropertyStatus.PENDING_REVIEW,
        Role.AGENT,
      ),
    ).not.toThrow();
  });

  it("throws a ListingServiceError with code TRANSITION_INVALID for an illegal transition", () => {
    try {
      assertListingTransition(
        PropertyStatus.PENDING_REVIEW,
        PropertyStatus.LIVE,
        Role.AGENT,
      );
      throw new Error("expected assertListingTransition to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ListingServiceError);
      expect((err as ListingServiceError).code).toBe("TRANSITION_INVALID");
    }
  });
});
