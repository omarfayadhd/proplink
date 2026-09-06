import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    property: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    enquiry: { create: vi.fn() },
  },
}));

vi.mock("@/services/email/mailer", () => ({
  sendNewEnquiryEmail: vi.fn().mockResolvedValue(undefined),
}));

import { db } from "@/lib/db";
import { sendNewEnquiryEmail } from "@/services/email/mailer";
import { PropertyStatus } from "@/generated/prisma/enums";
import { EnquiryServiceError } from "@/services/enquiries/errors";
import { createEnquiry } from "@/services/enquiries/enquiryService";

const mockDb = vi.mocked(db, true);
const mockSendNewEnquiryEmail = vi.mocked(sendNewEnquiryEmail);

beforeEach(() => vi.clearAllMocks());

const PROPERTY_ID = "property-1";
const BUYER_ID = "user-buyer-1";
const AGENT_EMAIL = "agent@proplink.test";

function propertyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: PROPERTY_ID,
    title: "Three-bed semi needing full refurbishment",
    status: PropertyStatus.LIVE,
    agentProfile: {
      id: "profile-1",
      user: { id: "agent-user-1", email: AGENT_EMAIL, name: "Alex Agent" },
    },
    ...overrides,
  } as never;
}

function buyerRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BUYER_ID,
    name: "Bea Buyer",
    email: "bea@example.com",
    ...overrides,
  } as never;
}

const validParams = {
  userId: BUYER_ID,
  propertyId: PROPERTY_ID,
  message: "I would like to arrange a viewing for this property, please.",
};

describe("createEnquiry", () => {
  it("404s when the property does not exist", async () => {
    mockDb.property.findUnique.mockResolvedValue(null);

    await expect(createEnquiry(validParams)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockDb.enquiry.create).not.toHaveBeenCalled();
  });

  it("throws EnquiryServiceError (not a bare Error) for a missing property", async () => {
    mockDb.property.findUnique.mockResolvedValue(null);

    await expect(createEnquiry(validParams)).rejects.toBeInstanceOf(EnquiryServiceError);
  });

  it.each([PropertyStatus.DRAFT, PropertyStatus.PENDING_REVIEW])(
    "404s (not 403 — doesn't leak existence) when the listing is %s (not yet public)",
    async (status) => {
      mockDb.property.findUnique.mockResolvedValue(propertyRow({ status }));

      await expect(createEnquiry(validParams)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
      expect(mockDb.enquiry.create).not.toHaveBeenCalled();
    },
  );

  it.each([PropertyStatus.LIVE, PropertyStatus.UNDER_OFFER, PropertyStatus.SOLD])(
    "accepts an enquiry on a publicly visible %s listing",
    async (status) => {
      mockDb.property.findUnique.mockResolvedValue(propertyRow({ status }));
      mockDb.user.findUnique.mockResolvedValue(buyerRow());
      mockDb.enquiry.create.mockResolvedValue({ id: "enquiry-1" } as never);

      const result = await createEnquiry(validParams);
      expect(result).toEqual({ id: "enquiry-1" });
    },
  );

  it("creates the Enquiry row with fromUserId/propertyId/message, message unchanged when no phone given", async () => {
    mockDb.property.findUnique.mockResolvedValue(propertyRow());
    mockDb.user.findUnique.mockResolvedValue(buyerRow());
    mockDb.enquiry.create.mockResolvedValue({ id: "enquiry-1" } as never);

    await createEnquiry(validParams);

    expect(mockDb.enquiry.create).toHaveBeenCalledWith({
      data: {
        propertyId: PROPERTY_ID,
        fromUserId: BUYER_ID,
        message: validParams.message,
      },
    });
  });

  it("prepends the contact phone to the stored message when provided", async () => {
    mockDb.property.findUnique.mockResolvedValue(propertyRow());
    mockDb.user.findUnique.mockResolvedValue(buyerRow());
    mockDb.enquiry.create.mockResolvedValue({ id: "enquiry-1" } as never);

    await createEnquiry({ ...validParams, contactPhone: "07700 900123" });

    const data = mockDb.enquiry.create.mock.calls[0][0].data as { message: string };
    expect(data.message).toContain("07700 900123");
    expect(data.message).toContain(validParams.message);
  });

  it("emails the agent with the listing title and enquirer's name/email", async () => {
    mockDb.property.findUnique.mockResolvedValue(propertyRow());
    mockDb.user.findUnique.mockResolvedValue(buyerRow());
    mockDb.enquiry.create.mockResolvedValue({ id: "enquiry-1" } as never);

    await createEnquiry(validParams);

    expect(mockSendNewEnquiryEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: AGENT_EMAIL,
        listingTitle: "Three-bed semi needing full refurbishment",
        fromName: "Bea Buyer",
        fromEmail: "bea@example.com",
        message: validParams.message,
        contactPhone: null,
      }),
    );
  });

  it("passes the contact phone through to the email params too", async () => {
    mockDb.property.findUnique.mockResolvedValue(propertyRow());
    mockDb.user.findUnique.mockResolvedValue(buyerRow());
    mockDb.enquiry.create.mockResolvedValue({ id: "enquiry-1" } as never);

    await createEnquiry({ ...validParams, contactPhone: "07700 900123" });

    expect(mockSendNewEnquiryEmail).toHaveBeenCalledWith(
      expect.objectContaining({ contactPhone: "07700 900123" }),
    );
  });

  it("does not create an Enquiry row when the enquirer's User record is missing", async () => {
    mockDb.property.findUnique.mockResolvedValue(propertyRow());
    mockDb.user.findUnique.mockResolvedValue(null);

    await expect(createEnquiry(validParams)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockDb.enquiry.create).not.toHaveBeenCalled();
  });
});
