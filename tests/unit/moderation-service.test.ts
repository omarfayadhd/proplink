import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    property: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    subscription: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@/services/email/mailer", () => ({
  sendListingApprovedEmail: vi.fn().mockResolvedValue(undefined),
  sendListingRejectedEmail: vi.fn().mockResolvedValue(undefined),
}));

import { db } from "@/lib/db";
import { PropertyStatus } from "@/generated/prisma/enums";
import {
  sendListingApprovedEmail,
  sendListingRejectedEmail,
} from "@/services/email/mailer";
import {
  approveListing,
  getListingForModeration,
  listPendingListings,
  rejectListing,
} from "@/services/listings/moderationService";

const mockDb = vi.mocked(db, true);
const mockSendApproved = vi.mocked(sendListingApprovedEmail);
const mockSendRejected = vi.mocked(sendListingRejectedEmail);

beforeEach(() => vi.clearAllMocks());

const PROPERTY_ID = "property-1";
const ADMIN_ID = "admin-1";
const AGENT_USER_ID = "agent-user-1";
const AGENT_EMAIL = "agent@proplink.test";
const TITLE = "Three-bed semi needing full refurbishment";

// Same `as never` convention as listing-service.test.ts: these fixtures only
// need to satisfy what moderationService actually reads (status, title,
// agentProfile.userId/active/user.email), not Prisma's full payload type.
function moderationListing(overrides: Record<string, unknown> = {}) {
  return {
    id: PROPERTY_ID,
    title: TITLE,
    status: PropertyStatus.PENDING_REVIEW,
    agentProfileId: "profile-1",
    agentProfile: {
      id: "profile-1",
      userId: AGENT_USER_ID,
      active: true,
      user: { id: AGENT_USER_ID, email: AGENT_EMAIL, name: "Agent Smith" },
    },
    distressTags: [],
    images: [],
    ...overrides,
  } as never;
}

describe("listPendingListings", () => {
  it("queries only PENDING_REVIEW listings", async () => {
    mockDb.property.findMany.mockResolvedValue([]);

    await listPendingListings();

    expect(mockDb.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: PropertyStatus.PENDING_REVIEW } }),
    );
  });
});

describe("getListingForModeration", () => {
  it("throws NOT_FOUND for an unknown listing", async () => {
    mockDb.property.findUnique.mockResolvedValue(null);

    await expect(getListingForModeration(PROPERTY_ID)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("approveListing", () => {
  it("approves a PENDING_REVIEW listing: LIVE + publishedAt, audit row, email", async () => {
    mockDb.property.findUnique.mockResolvedValue(moderationListing());
    mockDb.subscription.findUnique.mockResolvedValue(null);
    mockDb.property.count.mockResolvedValue(0); // well within the free-tier limit
    mockDb.property.update.mockResolvedValue(
      moderationListing({ status: PropertyStatus.LIVE }),
    );

    await approveListing({ listingId: PROPERTY_ID, adminUserId: ADMIN_ID });

    const call = mockDb.property.update.mock.calls[0][0];
    expect(call.data.status).toBe(PropertyStatus.LIVE);
    expect(call.data.publishedAt).toBeInstanceOf(Date);
    expect(call.data.rejectionReason).toBeNull(); // clears any stale reason

    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorUserId: ADMIN_ID,
          action: "LISTING_APPROVED",
          entity: "Property",
          entityId: PROPERTY_ID,
        }),
      }),
    );

    expect(mockSendApproved).toHaveBeenCalledWith(AGENT_EMAIL, TITLE);
  });

  it("blocks approval once the agent is at their free-tier listing limit", async () => {
    mockDb.property.findUnique.mockResolvedValue(moderationListing());
    mockDb.subscription.findUnique.mockResolvedValue(null);
    mockDb.property.count.mockResolvedValue(3); // already at the free-tier limit

    await expect(
      approveListing({ listingId: PROPERTY_ID, adminUserId: ADMIN_ID }),
    ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });

    expect(mockDb.property.update).not.toHaveBeenCalled();
    expect(mockDb.auditLog.create).not.toHaveBeenCalled();
    expect(mockSendApproved).not.toHaveBeenCalled();
  });

  it("rejects approving a listing that is not PENDING_REVIEW", async () => {
    mockDb.property.findUnique.mockResolvedValue(
      moderationListing({ status: PropertyStatus.DRAFT }),
    );

    await expect(
      approveListing({ listingId: PROPERTY_ID, adminUserId: ADMIN_ID }),
    ).rejects.toMatchObject({ code: "TRANSITION_INVALID" });

    expect(mockDb.auditLog.create).not.toHaveBeenCalled();
    expect(mockSendApproved).not.toHaveBeenCalled();
  });

  it("404s when the listing does not exist", async () => {
    mockDb.property.findUnique.mockResolvedValue(null);

    await expect(
      approveListing({ listingId: PROPERTY_ID, adminUserId: ADMIN_ID }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(mockDb.property.update).not.toHaveBeenCalled();
  });
});

describe("rejectListing", () => {
  it("requires a non-empty reason and never touches the DB when it's blank", async () => {
    await expect(
      rejectListing({ listingId: PROPERTY_ID, adminUserId: ADMIN_ID, reason: "   " }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    expect(mockDb.property.findUnique).not.toHaveBeenCalled();
    expect(mockDb.property.update).not.toHaveBeenCalled();
    expect(mockSendRejected).not.toHaveBeenCalled();
  });

  it("moves a PENDING_REVIEW listing back to DRAFT, persists the reason, audits, emails", async () => {
    mockDb.property.findUnique.mockResolvedValue(moderationListing());
    mockDb.property.update.mockResolvedValue(
      moderationListing({ status: PropertyStatus.DRAFT, rejectionReason: "Missing EPC" }),
    );

    await rejectListing({
      listingId: PROPERTY_ID,
      adminUserId: ADMIN_ID,
      reason: "Missing EPC certificate",
    });

    const call = mockDb.property.update.mock.calls[0][0];
    expect(call.data.status).toBe(PropertyStatus.DRAFT);
    expect(call.data.rejectionReason).toBe("Missing EPC certificate");

    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorUserId: ADMIN_ID,
          action: "LISTING_REJECTED",
          entity: "Property",
          entityId: PROPERTY_ID,
        }),
      }),
    );

    expect(mockSendRejected).toHaveBeenCalledWith(
      AGENT_EMAIL,
      TITLE,
      "Missing EPC certificate",
    );
  });

  it("trims the reason before persisting and emailing", async () => {
    mockDb.property.findUnique.mockResolvedValue(moderationListing());
    mockDb.property.update.mockResolvedValue(
      moderationListing({ status: PropertyStatus.DRAFT }),
    );

    await rejectListing({
      listingId: PROPERTY_ID,
      adminUserId: ADMIN_ID,
      reason: "  Missing EPC certificate  ",
    });

    const call = mockDb.property.update.mock.calls[0][0];
    expect(call.data.rejectionReason).toBe("Missing EPC certificate");
    expect(mockSendRejected).toHaveBeenCalledWith(
      AGENT_EMAIL,
      TITLE,
      "Missing EPC certificate",
    );
  });

  it("blocks rejecting a listing that is not PENDING_REVIEW", async () => {
    mockDb.property.findUnique.mockResolvedValue(
      moderationListing({ status: PropertyStatus.LIVE }),
    );

    await expect(
      rejectListing({
        listingId: PROPERTY_ID,
        adminUserId: ADMIN_ID,
        reason: "Too late",
      }),
    ).rejects.toMatchObject({ code: "TRANSITION_INVALID" });

    expect(mockDb.property.update).not.toHaveBeenCalled();
    expect(mockSendRejected).not.toHaveBeenCalled();
  });

  it("404s when the listing does not exist", async () => {
    mockDb.property.findUnique.mockResolvedValue(null);

    await expect(
      rejectListing({ listingId: PROPERTY_ID, adminUserId: ADMIN_ID, reason: "x" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
