import { beforeEach, describe, expect, it, vi } from "vitest";
import { eraseUser } from "@/services/users/erasure";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    verificationToken: { deleteMany: vi.fn() },
    kycRecord: { deleteMany: vi.fn() },
  },
}));

const mockDb = vi.mocked(db, true);

beforeEach(() => vi.clearAllMocks());

describe("eraseUser (GDPR right to erasure)", () => {
  it("anonymises the user in place", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "u1" } as never);

    const result = await eraseUser("u1");
    expect(result.ok).toBe(true);

    const update = mockDb.user.update.mock.calls[0][0];
    expect(update.where).toEqual({ id: "u1" });
    expect(update.data.email).toBe("erased-u1@anonymised.invalid");
    expect(update.data.name).toBe("Erased User");
    expect(update.data.passwordHash).toBeNull();
    expect(update.data.active).toBe(false);
  });

  it("NEVER deletes KYC records (UK AML 5-year retention)", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "u1" } as never);
    await eraseUser("u1");
    expect(mockDb.kycRecord.deleteMany).not.toHaveBeenCalled();
  });

  it("returns ok:false for unknown users", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    expect(await eraseUser("nope")).toEqual({ ok: false });
  });
});
