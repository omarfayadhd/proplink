import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAgent, createAgentSchema } from "@/services/admin/agents";
import { db } from "@/lib/db";
import { createToken } from "@/services/users/verificationTokens";
import { sendAgentInviteEmail } from "@/services/email/mailer";

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    agentProfile: { findUnique: vi.fn(), create: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/services/users/verificationTokens", () => ({ createToken: vi.fn() }));
vi.mock("@/services/email/mailer", () => ({
  sendAgentInviteEmail: vi.fn(),
  agentInviteUrl: (token: string) =>
    `http://localhost:3000/reset-password?token=${token}&invite=1`,
}));

const mockDb = vi.mocked(db, true);

const valid = {
  name: "Alice Agent",
  email: "Alice@Agency.CO.UK",
  agencyName: "Northside Estates",
  complianceCode: "RICS-44821",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.user.findUnique.mockResolvedValue(null as never);
  mockDb.agentProfile.findUnique.mockResolvedValue(null as never);
  // The service composes User + AgentProfile in one transaction; the mock runs
  // the callback so the individual creates are still observable.
  mockDb.$transaction.mockImplementation((async (fn: (tx: typeof db) => unknown) =>
    fn(db)) as never);
  mockDb.user.create.mockResolvedValue({
    id: "new-user",
    email: "alice@agency.co.uk",
  } as never);
  mockDb.agentProfile.create.mockResolvedValue({ id: "new-profile" } as never);
  vi.mocked(createToken).mockResolvedValue("raw-invite-token");
});

describe("createAgentSchema", () => {
  it("lowercases the email", () => {
    expect(createAgentSchema.parse(valid).email).toBe("alice@agency.co.uk");
  });

  it("rejects a missing agency name", () => {
    expect(createAgentSchema.safeParse({ ...valid, agencyName: "" }).success).toBe(false);
  });

  it("rejects a missing compliance code", () => {
    expect(createAgentSchema.safeParse({ ...valid, complianceCode: "" }).success).toBe(
      false,
    );
  });

  it("accepts any compliance code format", () => {
    // Deliberately unvalidated: inventing a regex would reject valid UK codes.
    expect(createAgentSchema.safeParse({ ...valid, complianceCode: "x/9" }).success).toBe(
      true,
    );
  });

  it("takes no password — an agent sets their own from the invite", () => {
    const parsed = createAgentSchema.parse({ ...valid, password: "Password123" });
    expect(parsed).not.toHaveProperty("password");
  });
});

describe("createAgent", () => {
  it("creates an AGENT user with no password and its agency profile", async () => {
    const result = await createAgent({ actorUserId: "admin-1", ...valid });

    expect(result.ok).toBe(true);
    expect(mockDb.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "alice@agency.co.uk",
        name: "Alice Agent",
        role: "AGENT",
        passwordHash: null,
      }),
    });
    expect(mockDb.agentProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "new-user",
        agencyName: "Northside Estates",
        complianceCode: "RICS-44821",
      }),
    });
  });

  it("issues an AGENT_INVITE token and emails the set-password link", async () => {
    const result = await createAgent({ actorUserId: "admin-1", ...valid });

    expect(createToken).toHaveBeenCalledWith("new-user", "AGENT_INVITE");
    expect(sendAgentInviteEmail).toHaveBeenCalledWith(
      "alice@agency.co.uk",
      "raw-invite-token",
    );
    expect(result.ok && result.inviteUrl).toContain("raw-invite-token");
  });

  it("writes an audit row naming the acting admin", async () => {
    await createAgent({ actorUserId: "admin-1", ...valid });

    expect(mockDb.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin-1",
        action: "AGENT_CREATED",
        entity: "User",
        entityId: "new-user",
      }),
    });
  });

  it("rejects a duplicate email without creating anything", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "existing" } as never);

    const result = await createAgent({ actorUserId: "admin-1", ...valid });

    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(mockDb.user.create).not.toHaveBeenCalled();
    expect(sendAgentInviteEmail).not.toHaveBeenCalled();
  });

  it("rejects a duplicate compliance code without creating anything", async () => {
    mockDb.agentProfile.findUnique.mockResolvedValue({ id: "existing" } as never);

    const result = await createAgent({ actorUserId: "admin-1", ...valid });

    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(result.ok === false && result.error).toMatch(/compliance code/i);
    expect(mockDb.user.create).not.toHaveBeenCalled();
  });

  it("returns a validation error rather than throwing on bad input", async () => {
    const result = await createAgent({
      actorUserId: "admin-1",
      ...valid,
      email: "not-an-email",
    });

    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(mockDb.user.create).not.toHaveBeenCalled();
  });

  it("does not email an invite when the transaction fails", async () => {
    mockDb.$transaction.mockRejectedValue(new Error("db down") as never);

    await expect(createAgent({ actorUserId: "admin-1", ...valid })).rejects.toThrow();
    expect(sendAgentInviteEmail).not.toHaveBeenCalled();
  });
});
