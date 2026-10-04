import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPassword } from "@/services/users/passwordReset";
import { consumeToken } from "@/services/users/verificationTokens";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({ db: { user: { update: vi.fn() } } }));
vi.mock("@/services/users/verificationTokens", () => ({
  consumeToken: vi.fn(),
  createToken: vi.fn(),
}));
vi.mock("@/services/email/mailer", () => ({ sendPasswordResetEmail: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(consumeToken).mockResolvedValue({ ok: true, userId: "agent-1" });
});

describe("resetPassword purposes", () => {
  it("defaults to PASSWORD_RESET so existing callers are unchanged", async () => {
    await resetPassword("raw", "Password123");
    expect(consumeToken).toHaveBeenCalledWith("raw", "PASSWORD_RESET");
  });

  it("sets an admin-invited agent's first password from an AGENT_INVITE token", async () => {
    const result = await resetPassword("raw", "Password123", "AGENT_INVITE");

    expect(result.ok).toBe(true);
    expect(consumeToken).toHaveBeenCalledWith("raw", "AGENT_INVITE");
    expect(vi.mocked(db.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "agent-1" },
        // A working invite link proves mailbox ownership, same as a reset.
        data: expect.objectContaining({ emailVerified: expect.any(Date) }),
      }),
    );
  });

  it("will not let a password-reset token be spent as an invite", async () => {
    vi.mocked(consumeToken).mockResolvedValue({ ok: false, reason: "invalid" });

    const result = await resetPassword("raw", "Password123", "AGENT_INVITE");

    expect(result.ok).toBe(false);
    expect(vi.mocked(db.user.update)).not.toHaveBeenCalled();
  });

  it("still enforces the password rules on an invite", async () => {
    const result = await resetPassword("raw", "short", "AGENT_INVITE");

    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(consumeToken).not.toHaveBeenCalled();
    expect(vi.mocked(db.user.update)).not.toHaveBeenCalled();
  });
});
