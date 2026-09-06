import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    property: {
      findUnique: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    savedProperty: { count: vi.fn() },
    enquiry: { count: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { PropertyStatus, Role } from "@/generated/prisma/enums";
import { ListingServiceError } from "@/services/listings/errors";
import {
  MAX_TRACKED_VIEWS,
  getAgentProfileAnalytics,
  parseViewedListings,
  recordListingView,
  serialiseViewedListings,
  shouldCountListingView,
} from "@/services/listings/analytics";

const mockDb = vi.mocked(db, true);

beforeEach(() => vi.clearAllMocks());

const PROPERTY_ID = "property-1";
const OWNER_USER_ID = "user-agent-1";

function propertyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: PROPERTY_ID,
    status: PropertyStatus.LIVE,
    agentProfile: { userId: OWNER_USER_ID },
    ...overrides,
  } as never;
}

describe("parseViewedListings / serialiseViewedListings", () => {
  it("round-trips a list of ids", () => {
    const ids = ["a", "b", "c"];
    expect(parseViewedListings(serialiseViewedListings(ids))).toEqual(ids);
  });

  it("treats an absent or empty cookie as no views", () => {
    expect(parseViewedListings(undefined)).toEqual([]);
    expect(parseViewedListings("")).toEqual([]);
    expect(parseViewedListings(null)).toEqual([]);
  });

  it("ignores blank segments from a malformed cookie", () => {
    expect(parseViewedListings("a,,b,")).toEqual(["a", "b"]);
  });

  // Cookies are capped at ~4KB by every browser; an unbounded list would
  // eventually be silently truncated mid-id and start double-counting.
  it("keeps only the most recent MAX_TRACKED_VIEWS ids", () => {
    const many = Array.from({ length: MAX_TRACKED_VIEWS + 10 }, (_, i) => `id-${i}`);
    const kept = parseViewedListings(serialiseViewedListings(many));

    expect(kept).toHaveLength(MAX_TRACKED_VIEWS);
    expect(kept.at(-1)).toBe(`id-${MAX_TRACKED_VIEWS + 9}`);
    expect(kept).not.toContain("id-0");
  });
});

describe("shouldCountListingView", () => {
  const base = {
    propertyId: PROPERTY_ID,
    viewedIds: [] as string[],
    viewer: null as { userId: string; role: Role } | null,
    ownerUserId: OWNER_USER_ID,
  };

  it("counts an anonymous first view", () => {
    expect(shouldCountListingView(base)).toBe(true);
  });

  it("counts a logged-in buyer's first view", () => {
    expect(
      shouldCountListingView({
        ...base,
        viewer: { userId: "buyer-1", role: Role.BUYER },
      }),
    ).toBe(true);
  });

  it("does not count a second view from the same session", () => {
    expect(shouldCountListingView({ ...base, viewedIds: [PROPERTY_ID] })).toBe(false);
  });

  it("still counts a different listing viewed in the same session", () => {
    expect(shouldCountListingView({ ...base, viewedIds: ["some-other-listing"] })).toBe(
      true,
    );
  });

  it("does not count the owning agent's own view", () => {
    expect(
      shouldCountListingView({
        ...base,
        viewer: { userId: OWNER_USER_ID, role: Role.AGENT },
      }),
    ).toBe(false);
  });

  it("counts a different agent's view (they are a genuine visitor)", () => {
    expect(
      shouldCountListingView({
        ...base,
        viewer: { userId: "user-agent-2", role: Role.AGENT },
      }),
    ).toBe(true);
  });

  it("does not count an admin's view", () => {
    expect(
      shouldCountListingView({
        ...base,
        viewer: { userId: "admin-1", role: Role.ADMIN },
      }),
    ).toBe(false);
  });
});

describe("recordListingView", () => {
  it("increments viewCount and remembers the listing for this session", async () => {
    mockDb.property.findUnique.mockResolvedValue(propertyRow());
    mockDb.property.update.mockResolvedValue({} as never);

    const result = await recordListingView({
      propertyId: PROPERTY_ID,
      viewer: null,
      viewedIds: [],
    });

    expect(result.counted).toBe(true);
    expect(result.viewedIds).toEqual([PROPERTY_ID]);
    expect(mockDb.property.update).toHaveBeenCalledWith({
      where: { id: PROPERTY_ID },
      data: { viewCount: { increment: 1 } },
    });
  });

  it("does not write on a repeat view, and leaves the session list unchanged", async () => {
    mockDb.property.findUnique.mockResolvedValue(propertyRow());

    const result = await recordListingView({
      propertyId: PROPERTY_ID,
      viewer: null,
      viewedIds: [PROPERTY_ID],
    });

    expect(result.counted).toBe(false);
    expect(result.viewedIds).toEqual([PROPERTY_ID]);
    expect(mockDb.property.update).not.toHaveBeenCalled();
  });

  it("does not write for the owning agent, but still records the visit locally", async () => {
    mockDb.property.findUnique.mockResolvedValue(propertyRow());

    const result = await recordListingView({
      propertyId: PROPERTY_ID,
      viewer: { userId: OWNER_USER_ID, role: Role.AGENT },
      viewedIds: [],
    });

    expect(result.counted).toBe(false);
    expect(mockDb.property.update).not.toHaveBeenCalled();
  });

  it("404s for an unknown listing", async () => {
    mockDb.property.findUnique.mockResolvedValue(null);

    await expect(
      recordListingView({ propertyId: PROPERTY_ID, viewer: null, viewedIds: [] }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws ListingServiceError (not a bare Error) for an unknown listing", async () => {
    mockDb.property.findUnique.mockResolvedValue(null);

    await expect(
      recordListingView({ propertyId: PROPERTY_ID, viewer: null, viewedIds: [] }),
    ).rejects.toBeInstanceOf(ListingServiceError);
  });

  // A non-public listing is only reachable by its owner or an admin (the page's
  // preview mode) — neither of whom counts anyway, so a view there is never a
  // real one. 404 rather than silently returning `counted: false`, matching how
  // the page and the enquiry service treat the same listing.
  it.each([PropertyStatus.DRAFT, PropertyStatus.PENDING_REVIEW])(
    "404s for a %s listing that is not publicly visible",
    async (status) => {
      mockDb.property.findUnique.mockResolvedValue(propertyRow({ status }));

      await expect(
        recordListingView({ propertyId: PROPERTY_ID, viewer: null, viewedIds: [] }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(mockDb.property.update).not.toHaveBeenCalled();
    },
  );
});

describe("getAgentProfileAnalytics", () => {
  it("sums views across the profile's listings and counts saves and leads", async () => {
    mockDb.property.count.mockResolvedValue(4 as never);
    mockDb.property.aggregate.mockResolvedValue({ _sum: { viewCount: 37 } } as never);
    mockDb.savedProperty.count.mockResolvedValue(9 as never);
    mockDb.enquiry.count
      .mockResolvedValueOnce(6 as never)
      .mockResolvedValueOnce(2 as never);

    const result = await getAgentProfileAnalytics("profile-1");

    expect(result).toEqual({ listings: 4, views: 37, saves: 9, leads: 6, newLeads: 2 });
  });

  // `_sum` is null when the profile has no listings at all — Prisma returns
  // `{ _sum: { viewCount: null } }`, not 0, and a null would render as blank.
  it("reports zero views for a profile with no listings", async () => {
    mockDb.property.count.mockResolvedValue(0 as never);
    mockDb.property.aggregate.mockResolvedValue({ _sum: { viewCount: null } } as never);
    mockDb.savedProperty.count.mockResolvedValue(0 as never);
    mockDb.enquiry.count.mockResolvedValue(0 as never);

    const result = await getAgentProfileAnalytics("profile-1");

    expect(result.views).toBe(0);
  });
});
