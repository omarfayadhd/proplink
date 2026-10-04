import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

// `VerificationToken.purpose` is a plain String column, so adding a purpose is
// code-only — no migration, which keeps constraint 8 (additive after Week 4).
export type TokenPurpose = "EMAIL_VERIFY" | "PASSWORD_RESET" | "AGENT_INVITE";

const TTL_MS: Record<TokenPurpose, number> = {
  EMAIL_VERIFY: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
  // An admin-issued invite sits in an inbox until the agent gets to it, so it
  // outlives a reset the user asked for seconds ago (ADR-019).
  AGENT_INVITE: 7 * 24 * 60 * 60 * 1000,
};

// Only the SHA-256 of the token is stored; the raw value exists solely in the
// emailed link.
function hash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Creates a single-use token, invalidating any previous ones for the same purpose. */
export async function createToken(
  userId: string,
  purpose: TokenPurpose,
): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.verificationToken.deleteMany({ where: { userId, purpose, usedAt: null } }),
    db.verificationToken.create({
      data: {
        userId,
        purpose,
        token: hash(raw),
        expiresAt: new Date(Date.now() + TTL_MS[purpose]),
      },
    }),
  ]);
  return raw;
}

export type ConsumeResult =
  { ok: true; userId: string } | { ok: false; reason: "invalid" | "expired" | "used" };

/** Validates and burns a token. */
export async function consumeToken(
  raw: string,
  purpose: TokenPurpose,
): Promise<ConsumeResult> {
  const record = await db.verificationToken.findUnique({
    where: { token: hash(raw) },
  });
  if (!record || record.purpose !== purpose) return { ok: false, reason: "invalid" };
  if (record.usedAt) return { ok: false, reason: "used" };
  if (record.expiresAt < new Date()) return { ok: false, reason: "expired" };

  await db.verificationToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  return { ok: true, userId: record.userId };
}
