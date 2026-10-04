import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    property: { findUnique: vi.fn() },
    savedProperty: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import { PropertyStatus } from "@/generated/prisma/enums";
import { ListingServiceError } from "@/services/listings/errors";
import {
  isListingSavedBy,
  listSavedForCards,
  savedPropertyIdsFor,
  saveListing,
  unsaveListing,
} from "@/services/listings/savedProperties";

const mockDb = vi.mocked(db, true);

beforeEach(() => vi.clearAllMocks());

const USER_ID = "buyer-1";
const PROPERTY_ID = "property-1";

function propertyRow(status: PropertyStatus = PropertyStatus.LIVE) {
  return { id: PROPERTY_ID, status } as never;
}

describe("saveListing", () => {
  it("creates the SavedProperty row", async () => {
    mockDb.property.findUnique.mockResolvedValue(propertyRow());
    mockDb.savedProperty.upsert.mockResolvedValue({} as never);

    await saveListing({ userId: USER_ID, propertyId: PROPERTY_ID });

    expect(mockDb.savedProperty.upsert).toHaveBeenCalledWith({
      where: { userId_propertyId: { userId: USER_ID, propertyId: PROPERTY_ID } },
      create: { userId: USER_ID, propertyId: PROPERTY_ID },
      update: {},
    });
  });

  // `SavedProperty`'s PK is (userId, propertyId), so a double-click would throw
  // a unique violation on a plain `create`. Upsert makes it idempotent — saving
  // twice is not an error, it is just still saved.
  it("is idempotent — saving an already-saved listing does not throw", async () => {
    mockDb.property.findUnique.mockResolvedValue(propertyRow());
    mockDb.savedProperty.upsert.mockResolvedValue({} as never);

    await expect(
      saveListing({ userId: USER_ID, propertyId: PROPERTY_ID }),
    ).resolves.not.toThrow();
  });

  it("404s for an unknown listing", async () => {
    mockDb.property.findUnique.mockResolvedValue(null);

    await expect(
      saveListing({ userId: USER_ID, propertyId: PROPERTY_ID }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockDb.savedProperty.upsert).not.toHaveBeenCalled();
  });

  it("throws ListingServiceError for an unknown listing", async () => {
    mockDb.property.findUnique.mockResolvedValue(null);

    await expect(
      saveListing({ userId: USER_ID, propertyId: PROPERTY_ID }),
    ).rejects.toBeInstanceOf(ListingServiceError);
  });

  it.each([PropertyStatus.DRAFT, PropertyStatus.PENDING_REVIEW])(
    "404s for a %s listing — you cannot save what you cannot see",
    async (status) => {
      mockDb.property.findUnique.mockResolvedValue(propertyRow(status));

      await expect(
        saveListing({ userId: USER_ID, propertyId: PROPERTY_ID }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(mockDb.savedProperty.upsert).not.toHaveBeenCalled();
    },
  );
});

describe("unsaveListing", () => {
  // `deleteMany`, not `delete`: deleting a row that isn't there is the desired
  // end state, not an error, and `delete` would throw P2025.
  it("removes the row and is idempotent when there is nothing to remove", async () => {
    mockDb.savedProperty.deleteMany.mockResolvedValue({ count: 0 } as never);

    await expect(
      unsaveListing({ userId: USER_ID, propertyId: PROPERTY_ID }),
    ).resolves.not.toThrow();

    expect(mockDb.savedProperty.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, propertyId: PROPERTY_ID },
    });
  });

  // Unsaving must keep working after a listing leaves public visibility —
  // otherwise a buyer could be stuck with an un-removable saved listing.
  it("does not check listing visibility", async () => {
    mockDb.savedProperty.deleteMany.mockResolvedValue({ count: 1 } as never);

    await unsaveListing({ userId: USER_ID, propertyId: PROPERTY_ID });

    expect(mockDb.property.findUnique).not.toHaveBeenCalled();
  });
});

describe("isListingSavedBy", () => {
  it("is true when a row exists", async () => {
    mockDb.savedProperty.findUnique.mockResolvedValue({ userId: USER_ID } as never);
    expect(await isListingSavedBy({ userId: USER_ID, propertyId: PROPERTY_ID })).toBe(
      true,
    );
  });

  it("is false when no row exists", async () => {
    mockDb.savedProperty.findUnique.mockResolvedValue(null);
    expect(await isListingSavedBy({ userId: USER_ID, propertyId: PROPERTY_ID })).toBe(
      false,
    );
  });
});

/**
 * The results grid renders a heart per card, so it needs the whole page's
 * saved set in one go. Anything that made this per-card would reintroduce the
 * N+1 it exists to avoid.
 */
describe("savedPropertyIdsFor", () => {
  it("returns the saved ids as a set, scoped to the user in the query", async () => {
    mockDb.savedProperty.findMany.mockResolvedValue([
      { propertyId: "p1" },
      { propertyId: "p3" },
    ] as never);

    const ids = await savedPropertyIdsFor({
      userId: USER_ID,
      propertyIds: ["p1", "p2", "p3"],
    });

    expect(ids).toEqual(new Set(["p1", "p3"]));
    expect(mockDb.savedProperty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID, propertyId: { in: ["p1", "p2", "p3"] } },
      }),
    );
  });

  // An empty results page is normal (a filter that matches nothing), and
  // `IN ()` is a query whose answer is already known.
  it("does not query at all for an empty id list", async () => {
    const ids = await savedPropertyIdsFor({ userId: USER_ID, propertyIds: [] });

    expect(ids.size).toBe(0);
    expect(mockDb.savedProperty.findMany).not.toHaveBeenCalled();
  });
});

describe("listSavedForCards", () => {
  it("maps a saved row onto the card shape the search grid renders", async () => {
    mockDb.savedProperty.findMany.mockResolvedValue([
      {
        property: {
          id: "p1",
          title: "Probate sale — three-bed semi",
          city: "London",
          region: "Greater London",
          postcode: "E1 6AN",
          propertyType: "RESIDENTIAL",
          bedrooms: 3,
          askingPriceGBP: 4_500_000,
          targetRoiPct: 8,
          epcRating: "D",
          status: "LIVE",
          publishedAt: new Date("2026-08-07T00:00:00Z"),
          images: [{ url: "/a.svg" }, { url: "/b.svg" }],
          distressTags: [{ tag: "PROBATE" }],
        },
      },
    ] as never);

    const [card] = await listSavedForCards(USER_ID);

    expect(card).toMatchObject({
      id: "p1",
      askingPriceGBP: 4_500_000,
      // The first image by sortOrder stays the single-image field, so the
      // carousel and the older `imageUrl` consumers agree about the cover shot.
      imageUrl: "/a.svg",
      imageUrls: ["/a.svg", "/b.svg"],
      distressTags: ["PROBATE"],
    });
  });

  it("tolerates a saved listing with no photos", async () => {
    mockDb.savedProperty.findMany.mockResolvedValue([
      {
        property: {
          id: "p2",
          title: "No photos yet",
          city: "Leeds",
          region: "West Yorkshire",
          postcode: "LS1 1AA",
          propertyType: "RESIDENTIAL",
          bedrooms: 0,
          askingPriceGBP: 1_000_00,
          targetRoiPct: null,
          epcRating: null,
          status: "LIVE",
          publishedAt: null,
          images: [],
          distressTags: [],
        },
      },
    ] as never);

    const [card] = await listSavedForCards(USER_ID);

    expect(card.imageUrl).toBeNull();
    expect(card.imageUrls).toEqual([]);
  });
});
