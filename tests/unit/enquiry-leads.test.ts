import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    agentProfile: { findUnique: vi.fn() },
    enquiry: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { EnquiryStatus } from "@/generated/prisma/enums";
import { EnquiryServiceError } from "@/services/enquiries/errors";
import {
  listEnquiriesForAgentProfile,
  updateEnquiryStatus,
} from "@/services/enquiries/enquiryService";

const mockDb = vi.mocked(db, true);

beforeEach(() => vi.clearAllMocks());

const AGENT_USER_ID = "user-agent-1";
const AGENT_PROFILE_ID = "profile-1";
const ENQUIRY_ID = "enquiry-1";

function enquiryRow(ownerUserId = AGENT_USER_ID) {
  return {
    id: ENQUIRY_ID,
    status: EnquiryStatus.NEW,
    property: { id: "property-1", agentProfile: { userId: ownerUserId } },
  } as never;
}

describe("listEnquiriesForAgentProfile", () => {
  it("returns the profile's enquiries, newest first, when the agent owns it", async () => {
    mockDb.agentProfile.findUnique.mockResolvedValue({
      id: AGENT_PROFILE_ID,
      userId: AGENT_USER_ID,
    } as never);
    mockDb.enquiry.findMany.mockResolvedValue([{ id: ENQUIRY_ID }] as never);

    const result = await listEnquiriesForAgentProfile({
      agentProfileId: AGENT_PROFILE_ID,
      agentUserId: AGENT_USER_ID,
    });

    expect(result).toEqual([{ id: ENQUIRY_ID }]);
    const args = mockDb.enquiry.findMany.mock.calls[0][0] as {
      where: { property: { agentProfileId: string } };
      orderBy: { createdAt: string };
    };
    expect(args.where.property.agentProfileId).toBe(AGENT_PROFILE_ID);
    expect(args.orderBy).toEqual({ createdAt: "desc" });
  });

  it("refuses a profile the agent does not own, without querying enquiries", async () => {
    mockDb.agentProfile.findUnique.mockResolvedValue({
      id: AGENT_PROFILE_ID,
      userId: "someone-else",
    } as never);

    await expect(
      listEnquiriesForAgentProfile({
        agentProfileId: AGENT_PROFILE_ID,
        agentUserId: AGENT_USER_ID,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mockDb.enquiry.findMany).not.toHaveBeenCalled();
  });

  it("refuses an unknown profile the same way (no existence leak)", async () => {
    mockDb.agentProfile.findUnique.mockResolvedValue(null);

    await expect(
      listEnquiriesForAgentProfile({
        agentProfileId: AGENT_PROFILE_ID,
        agentUserId: AGENT_USER_ID,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("updateEnquiryStatus", () => {
  it.each([EnquiryStatus.RESPONDED, EnquiryStatus.CLOSED, EnquiryStatus.NEW])(
    "persists status %s for an enquiry on the agent's own listing",
    async (status) => {
      mockDb.enquiry.findUnique.mockResolvedValue(enquiryRow());
      mockDb.enquiry.update.mockResolvedValue({ id: ENQUIRY_ID, status } as never);

      const result = await updateEnquiryStatus({
        enquiryId: ENQUIRY_ID,
        agentUserId: AGENT_USER_ID,
        status,
      });

      expect(result.status).toBe(status);
      expect(mockDb.enquiry.update).toHaveBeenCalledWith({
        where: { id: ENQUIRY_ID },
        data: { status },
      });
    },
  );

  // Ownership is via the enquiry's listing's agent profile — an agent may own
  // several profiles, and any of them qualifies, so the check is on the
  // profile's `userId`, not on a single "active" profile id.
  it("forbids an agent from touching another agency's lead", async () => {
    mockDb.enquiry.findUnique.mockResolvedValue(enquiryRow("user-agent-2"));

    await expect(
      updateEnquiryStatus({
        enquiryId: ENQUIRY_ID,
        agentUserId: AGENT_USER_ID,
        status: EnquiryStatus.CLOSED,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mockDb.enquiry.update).not.toHaveBeenCalled();
  });

  it("404s for an unknown enquiry", async () => {
    mockDb.enquiry.findUnique.mockResolvedValue(null);

    await expect(
      updateEnquiryStatus({
        enquiryId: ENQUIRY_ID,
        agentUserId: AGENT_USER_ID,
        status: EnquiryStatus.CLOSED,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws EnquiryServiceError, not a bare Error", async () => {
    mockDb.enquiry.findUnique.mockResolvedValue(null);

    await expect(
      updateEnquiryStatus({
        enquiryId: ENQUIRY_ID,
        agentUserId: AGENT_USER_ID,
        status: EnquiryStatus.CLOSED,
      }),
    ).rejects.toBeInstanceOf(EnquiryServiceError);
  });

  // Defence in depth beyond the route's Zod enum — the service is callable
  // directly (server actions, future jobs), so it validates too.
  it("rejects a status outside the EnquiryStatus enum", async () => {
    mockDb.enquiry.findUnique.mockResolvedValue(enquiryRow());

    await expect(
      updateEnquiryStatus({
        enquiryId: ENQUIRY_ID,
        agentUserId: AGENT_USER_ID,
        status: "ARCHIVED" as never,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(mockDb.enquiry.update).not.toHaveBeenCalled();
  });
});
