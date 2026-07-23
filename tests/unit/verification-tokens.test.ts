import { beforeEach, describe, expect, it, vi } from "vitest";
import { createToken, consumeToken } from "@/services/users/verificationTokens";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(async (ops: unknown[]) => ops),
    verificationToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockDb = vi.mocked(db, true);

beforeEach(() => vi.clearAllMocks());

describe("createToken", () => {
  it("returns a raw token but stores only its hash", async () => {
    const raw = await createToken("user-1", "EMAIL_VERIFY");
    expect(raw.length).toBeGreaterThanOrEqual(32);

    const createArg = mockDb.verificationToken.create.mock.calls[0][0];
    expect(createArg.data.token).not.toBe(raw);
    expect(createArg.data.token).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
    expect(createArg.data.userId).toBe("user-1");
  });

  it("invalidates previous unused tokens for the same purpose", async () => {
    await createToken("user-1", "PASSWORD_RESET");
    expect(mockDb.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", purpose: "PASSWORD_RESET", usedAt: null },
    });
  });
});

describe("consumeToken", () => {
  it("rejects unknown tokens", async () => {
    mockDb.verificationToken.findUnique.mockResolvedValue(null);
    expect(await consumeToken("nope", "EMAIL_VERIFY")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("rejects wrong-purpose tokens", async () => {
    mockDb.verificationToken.findUnique.mockResolvedValue({
      id: "t1",
      purpose: "PASSWORD_RESET",
      usedAt: null,
      expiresAt: new Date(Date.now() + 1000),
      userId: "user-1",
    } as never);
    expect((await consumeToken("x", "EMAIL_VERIFY")).ok).toBe(false);
  });

  it("rejects used and expired tokens", async () => {
    mockDb.verificationToken.findUnique.mockResolvedValue({
      id: "t1",
      purpose: "EMAIL_VERIFY",
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000),
      userId: "user-1",
    } as never);
    expect(await consumeToken("x", "EMAIL_VERIFY")).toEqual({
      ok: false,
      reason: "used",
    });

    mockDb.verificationToken.findUnique.mockResolvedValue({
      id: "t1",
      purpose: "EMAIL_VERIFY",
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      userId: "user-1",
    } as never);
    expect(await consumeToken("x", "EMAIL_VERIFY")).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("burns and returns userId on success", async () => {
    mockDb.verificationToken.findUnique.mockResolvedValue({
      id: "t1",
      purpose: "EMAIL_VERIFY",
      usedAt: null,
      expiresAt: new Date(Date.now() + 1000),
      userId: "user-9",
    } as never);

    expect(await consumeToken("x", "EMAIL_VERIFY")).toEqual({
      ok: true,
      userId: "user-9",
    });
    expect(mockDb.verificationToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "t1" } }),
    );
  });
});
