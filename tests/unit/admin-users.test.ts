import { beforeEach, describe, expect, it, vi } from "vitest";
import { setUserActive } from "@/services/admin/users";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

const mockDb = vi.mocked(db, true);

beforeEach(() => vi.clearAllMocks());

describe("setUserActive", () => {
  it("deactivates a user AND writes an audit row", async () => {
    mockDb.user.findUnique.mockResolvedValue({
      id: "u2",
      email: "agent@proplink.test",
    } as never);

    const result = await setUserActive({
      actorUserId: "admin-1",
      userId: "u2",
      active: false,
    });

    expect(result.ok).toBe(true);
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "u2" },
      data: { active: false },
    });
    expect(mockDb.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin-1",
        action: "USER_DEACTIVATED",
        entity: "User",
        entityId: "u2",
      }),
    });
  });

  it("refuses self-deactivation", async () => {
    const result = await setUserActive({
      actorUserId: "admin-1",
      userId: "admin-1",
      active: false,
    });
    expect(result.ok).toBe(false);
    expect(mockDb.user.update).not.toHaveBeenCalled();
    expect(mockDb.auditLog.create).not.toHaveBeenCalled();
  });
});
