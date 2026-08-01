import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    property: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    agentProfile: { findUnique: vi.fn() },
    subscription: { findUnique: vi.fn() },
    propertyDistressTag: { deleteMany: vi.fn(), createMany: vi.fn() },
    propertyImage: { deleteMany: vi.fn(), createMany: vi.fn() },
    // Only the array-of-operations overload is used by the service; typed
    // `never` because the other ($transaction(fn)) overload doesn't apply.
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)) as never,
    $executeRaw: vi.fn(),
  },
}));

vi.mock("@/services/maps", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/maps")>();
  return { ...actual, geocodePostcode: vi.fn() };
});

import { db } from "@/lib/db";
import { geocodePostcode } from "@/services/maps";
import { PropertyStatus, Role } from "@/generated/prisma/enums";
import { ListingServiceError } from "@/services/listings/errors";
import type { CreateListingInput } from "@/services/listings/validation";
import {
  createDraft,
  submitForReview,
  transitionStatus,
  updateDraft,
} from "@/services/listings/listingService";

const mockDb = vi.mocked(db, true);
const mockGeocode = vi.mocked(geocodePostcode);

beforeEach(() => {
  vi.clearAllMocks();
  mockGeocode.mockResolvedValue({ lat: 53.48, lng: -2.24 });
  mockDb.$transaction.mockImplementation((async (ops: unknown[]) =>
    Promise.all(ops)) as never);
});

const AGENT_USER_ID = "user-agent-1";
const AGENT_PROFILE_ID = "profile-1";
const PROPERTY_ID = "property-1";

// Prisma's generated payload types are far stricter than these fixtures need
// to be for pure call-shape assertions — `as never` (same convention as
// tests/unit/admin-users.test.ts) opts the mock values out of that checking.
function ownedProfile(overrides: Partial<{ userId: string; active: boolean }> = {}) {
  return {
    id: AGENT_PROFILE_ID,
    userId: AGENT_USER_ID,
    active: true,
    ...overrides,
  } as never;
}

function propertyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: PROPERTY_ID,
    agentProfileId: AGENT_PROFILE_ID,
    agentProfile: ownedProfile(),
    status: PropertyStatus.DRAFT,
    postcode: "M1 1AE",
    distressTags: [{ propertyId: PROPERTY_ID, tag: "PROBATE" }],
    pricingSafeguardAckAt: new Date(),
    epcRating: "D",
    ...overrides,
  } as never;
}

const validCreateInput: CreateListingInput = {
  agentProfileId: AGENT_PROFILE_ID,
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
  targetRoiPct: null,
  distressTags: [],
  epcRating: null,
  epcCertUrl: null,
  floorPlanUrl: null,
  images: [],
  pricingSafeguardAck: false,
};

describe("createDraft", () => {
  it("rejects when the agentProfileId does not belong to the caller", async () => {
    mockDb.agentProfile.findUnique.mockResolvedValue(
      ownedProfile({ userId: "someone-else" }),
    );

    await expect(
      createDraft({ userId: AGENT_USER_ID, input: validCreateInput }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(mockDb.property.create).not.toHaveBeenCalled();
  });

  it("rejects when the agentProfileId does not exist at all", async () => {
    mockDb.agentProfile.findUnique.mockResolvedValue(null);

    await expect(
      createDraft({ userId: AGENT_USER_ID, input: validCreateInput }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates the Property as DRAFT, geocodes the postcode, and sets the PostGIS location", async () => {
    mockDb.agentProfile.findUnique.mockResolvedValue(ownedProfile());
    mockDb.property.create.mockResolvedValue(
      propertyRow({ status: PropertyStatus.DRAFT }),
    );
    mockDb.property.findUnique.mockResolvedValue(
      propertyRow({ status: PropertyStatus.DRAFT }),
    );

    await createDraft({ userId: AGENT_USER_ID, input: validCreateInput });

    expect(mockDb.property.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agentProfileId: AGENT_PROFILE_ID,
          status: PropertyStatus.DRAFT,
          askingPriceGBP: 15_000_00,
        }),
      }),
    );
    expect(mockGeocode).toHaveBeenCalledWith("M1 1AE");
    expect(mockDb.$executeRaw).toHaveBeenCalledTimes(1);
    const rawArgs = mockDb.$executeRaw.mock.calls[0];
    expect(rawArgs).toContain(-2.24); // lng
    expect(rawArgs).toContain(53.48); // lat
    expect(rawArgs).toContain(PROPERTY_ID);
  });

  it("stores pricingSafeguardAckAt only when the checkbox was ticked", async () => {
    mockDb.agentProfile.findUnique.mockResolvedValue(ownedProfile());
    mockDb.property.create.mockResolvedValue(propertyRow());
    mockDb.property.findUnique.mockResolvedValue(propertyRow());

    await createDraft({
      userId: AGENT_USER_ID,
      input: { ...validCreateInput, pricingSafeguardAck: true },
    });

    const data = mockDb.property.create.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.pricingSafeguardAckAt).toBeInstanceOf(Date);
  });

  it("leaves pricingSafeguardAckAt null when the checkbox was not ticked", async () => {
    mockDb.agentProfile.findUnique.mockResolvedValue(ownedProfile());
    mockDb.property.create.mockResolvedValue(propertyRow());
    mockDb.property.findUnique.mockResolvedValue(propertyRow());

    await createDraft({ userId: AGENT_USER_ID, input: validCreateInput });

    const data = mockDb.property.create.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.pricingSafeguardAckAt).toBeNull();
  });
});

describe("updateDraft", () => {
  it("404s when the listing does not exist", async () => {
    mockDb.property.findUnique.mockResolvedValue(null);

    await expect(
      updateDraft({ userId: AGENT_USER_ID, propertyId: PROPERTY_ID, input: {} }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("forbids editing a listing owned by a different agent", async () => {
    mockDb.property.findUnique.mockResolvedValue(
      propertyRow({ agentProfile: ownedProfile({ userId: "someone-else" }) }),
    );

    await expect(
      updateDraft({ userId: AGENT_USER_ID, propertyId: PROPERTY_ID, input: {} }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses to edit a listing that is no longer DRAFT", async () => {
    mockDb.property.findUnique.mockResolvedValue(
      propertyRow({ status: PropertyStatus.PENDING_REVIEW }),
    );

    await expect(
      updateDraft({
        userId: AGENT_USER_ID,
        propertyId: PROPERTY_ID,
        input: { title: "x" },
      }),
    ).rejects.toMatchObject({ code: "TRANSITION_INVALID" });

    expect(mockDb.property.update).not.toHaveBeenCalled();
  });

  it("re-geocodes only when the postcode actually changes", async () => {
    mockDb.property.findUnique
      .mockResolvedValueOnce(propertyRow({ postcode: "M1 1AE" })) // ownership fetch
      .mockResolvedValueOnce(propertyRow({ postcode: "M1 1AE" })); // final re-fetch

    await updateDraft({
      userId: AGENT_USER_ID,
      propertyId: PROPERTY_ID,
      input: { title: "Updated title" },
    });

    expect(mockGeocode).not.toHaveBeenCalled();
    expect(mockDb.$executeRaw).not.toHaveBeenCalled();
  });

  it("re-geocodes when the postcode changes", async () => {
    mockDb.property.findUnique
      .mockResolvedValueOnce(propertyRow({ postcode: "M1 1AE" }))
      .mockResolvedValueOnce(propertyRow({ postcode: "SW1A 1AA" }));

    await updateDraft({
      userId: AGENT_USER_ID,
      propertyId: PROPERTY_ID,
      input: { postcode: "SW1A 1AA" },
    });

    expect(mockGeocode).toHaveBeenCalledWith("SW1A 1AA");
    expect(mockDb.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it("only writes fields present in the partial input", async () => {
    mockDb.property.findUnique
      .mockResolvedValueOnce(propertyRow())
      .mockResolvedValueOnce(propertyRow());

    await updateDraft({
      userId: AGENT_USER_ID,
      propertyId: PROPERTY_ID,
      input: { askingPriceGBP: 20_000_00 },
    });

    const data = mockDb.property.update.mock.calls[0][0].data as Record<string, unknown>;
    expect(data).toEqual({ askingPriceGBP: 20_000_00 });
  });
});

describe("submitForReview", () => {
  it("blocks submission when the listing is not ready (e.g. no distress tags)", async () => {
    mockDb.property.findUnique.mockResolvedValue(propertyRow({ distressTags: [] }));

    await expect(
      submitForReview({ userId: AGENT_USER_ID, propertyId: PROPERTY_ID }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    expect(mockDb.property.update).not.toHaveBeenCalled();
  });

  it("blocks submission when the pricing safeguard has not been acknowledged", async () => {
    mockDb.property.findUnique.mockResolvedValue(
      propertyRow({ pricingSafeguardAckAt: null }),
    );

    await expect(
      submitForReview({ userId: AGENT_USER_ID, propertyId: PROPERTY_ID }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("moves a complete DRAFT listing to PENDING_REVIEW", async () => {
    mockDb.property.findUnique.mockResolvedValue(
      propertyRow({ status: PropertyStatus.DRAFT }),
    );
    mockDb.property.update.mockResolvedValue(
      propertyRow({ status: PropertyStatus.PENDING_REVIEW }),
    );

    const result = await submitForReview({
      userId: AGENT_USER_ID,
      propertyId: PROPERTY_ID,
    });

    expect(mockDb.property.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PROPERTY_ID },
        data: expect.objectContaining({ status: PropertyStatus.PENDING_REVIEW }),
      }),
    );
    expect(result.status).toBe(PropertyStatus.PENDING_REVIEW);
  });
});

describe("transitionStatus", () => {
  it("404s for an unknown property", async () => {
    mockDb.property.findUnique.mockResolvedValue(null);

    await expect(
      transitionStatus({
        actorUserId: AGENT_USER_ID,
        actorRole: Role.ADMIN,
        propertyId: PROPERTY_ID,
        to: PropertyStatus.LIVE,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("forbids an agent from transitioning a listing they do not own", async () => {
    mockDb.property.findUnique.mockResolvedValue(
      propertyRow({ agentProfile: ownedProfile({ userId: "someone-else" }) }),
    );

    await expect(
      transitionStatus({
        actorUserId: AGENT_USER_ID,
        actorRole: Role.AGENT,
        propertyId: PROPERTY_ID,
        to: PropertyStatus.UNDER_OFFER,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an agent trying to approve their own listing to LIVE", async () => {
    mockDb.property.findUnique.mockResolvedValue(
      propertyRow({ status: PropertyStatus.PENDING_REVIEW }),
    );

    await expect(
      transitionStatus({
        actorUserId: AGENT_USER_ID,
        actorRole: Role.AGENT,
        propertyId: PROPERTY_ID,
        to: PropertyStatus.LIVE,
      }),
    ).rejects.toMatchObject({ code: "TRANSITION_INVALID" });
  });

  it("lets an admin approve PENDING_REVIEW -> LIVE and stamps publishedAt", async () => {
    mockDb.property.findUnique.mockResolvedValue(
      propertyRow({ status: PropertyStatus.PENDING_REVIEW }),
    );
    mockDb.subscription.findUnique.mockResolvedValue(null);
    mockDb.property.count.mockResolvedValue(0); // well within the free-tier limit
    mockDb.property.update.mockResolvedValue(
      propertyRow({ status: PropertyStatus.LIVE }),
    );

    await transitionStatus({
      actorUserId: "admin-1",
      actorRole: Role.ADMIN,
      propertyId: PROPERTY_ID,
      to: PropertyStatus.LIVE,
    });

    const call = mockDb.property.update.mock.calls[0][0];
    expect(call.data.status).toBe(PropertyStatus.LIVE);
    expect(call.data.publishedAt).toBeInstanceOf(Date);
  });

  it("blocks approval to LIVE once the agent is at their listing limit", async () => {
    mockDb.property.findUnique.mockResolvedValue(
      propertyRow({ status: PropertyStatus.PENDING_REVIEW }),
    );
    mockDb.subscription.findUnique.mockResolvedValue(null);
    mockDb.property.count.mockResolvedValue(3); // already at the free-tier limit

    await expect(
      transitionStatus({
        actorUserId: "admin-1",
        actorRole: Role.ADMIN,
        propertyId: PROPERTY_ID,
        to: PropertyStatus.LIVE,
      }),
    ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });

    expect(mockDb.property.update).not.toHaveBeenCalled();
  });

  it("lets an agent move their own LIVE listing to UNDER_OFFER then SOLD", async () => {
    mockDb.property.findUnique.mockResolvedValue(
      propertyRow({ status: PropertyStatus.LIVE }),
    );
    mockDb.property.update.mockResolvedValue(
      propertyRow({ status: PropertyStatus.UNDER_OFFER }),
    );

    await transitionStatus({
      actorUserId: AGENT_USER_ID,
      actorRole: Role.AGENT,
      propertyId: PROPERTY_ID,
      to: PropertyStatus.UNDER_OFFER,
    });

    expect(mockDb.property.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "UNDER_OFFER" }),
      }),
    );
  });

  it("throws ListingServiceError (not a bare Error) for illegal transitions", async () => {
    mockDb.property.findUnique.mockResolvedValue(
      propertyRow({ status: PropertyStatus.SOLD }),
    );

    await expect(
      transitionStatus({
        actorUserId: AGENT_USER_ID,
        actorRole: Role.AGENT,
        propertyId: PROPERTY_ID,
        to: PropertyStatus.LIVE,
      }),
    ).rejects.toBeInstanceOf(ListingServiceError);
  });
});
