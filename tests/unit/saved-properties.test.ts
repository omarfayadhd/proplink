import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    property: { findUnique: vi.fn() },
    savedProperty: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import { PropertyStatus } from "@/generated/prisma/enums";
import { ListingServiceError } from "@/services/listings/errors";
import {
  isListingSavedBy,
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
