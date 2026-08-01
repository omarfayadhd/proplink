import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    property: { count: vi.fn() },
    subscription: { findUnique: vi.fn() },
  },
}));

import {
  assertWithinListingLimit,
  countLiveListings,
} from "@/services/listings/listingService";
import { ListingServiceError } from "@/services/listings/errors";
import { db } from "@/lib/db";

const mockDb = vi.mocked(db, true);

beforeEach(() => vi.clearAllMocks());

describe("countLiveListings", () => {
  it("counts only LIVE properties across the agent user's profiles", async () => {
    mockDb.property.count.mockResolvedValue(2);

    const count = await countLiveListings("agent-user-1");

    expect(count).toBe(2);
    expect(mockDb.property.count).toHaveBeenCalledWith({
      where: { status: "LIVE", agentProfile: { userId: "agent-user-1" } },
    });
  });
});

describe("assertWithinListingLimit", () => {
  it("treats a missing Subscription as the free tier (limit 3) and allows under it", async () => {
    mockDb.subscription.findUnique.mockResolvedValue(null);
    mockDb.property.count.mockResolvedValue(2);

    await expect(assertWithinListingLimit("agent-user-1")).resolves.toBeUndefined();
  });

  it("blocks the 4th live listing at the default free-tier limit of 3", async () => {
    mockDb.subscription.findUnique.mockResolvedValue(null);
    mockDb.property.count.mockResolvedValue(3);

    await expect(assertWithinListingLimit("agent-user-1")).rejects.toBeInstanceOf(
      ListingServiceError,
    );
    await assertWithinListingLimit("agent-user-1").catch((err: ListingServiceError) => {
      expect(err.code).toBe("LIMIT_EXCEEDED");
    });
  });

  it("reads Subscription.listingLimit for a paid tier instead of the free default", async () => {
    mockDb.subscription.findUnique.mockResolvedValue({ listingLimit: 10 } as never);
    mockDb.property.count.mockResolvedValue(9);
    await expect(assertWithinListingLimit("agent-user-1")).resolves.toBeUndefined();

    mockDb.property.count.mockResolvedValue(10);
    await expect(assertWithinListingLimit("agent-user-1")).rejects.toBeInstanceOf(
      ListingServiceError,
    );
  });
});
