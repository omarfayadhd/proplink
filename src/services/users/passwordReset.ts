import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/services/email/mailer";
import { consumeToken, createToken } from "@/services/users/verificationTokens";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

/** Always resolves without revealing whether the email exists (no enumeration). */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.active) return;
  const token = await createToken(user.id, "PASSWORD_RESET");
  await sendPasswordResetEmail(user.email, token);
}

export type ResetResult = { ok: true } | { ok: false; error: string; status: number };

export async function resetPassword(
  rawToken: string,
  newPassword: string,
): Promise<ResetResult> {
  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, status: 400 };
  }

  const result = await consumeToken(rawToken, "PASSWORD_RESET");
  if (!result.ok) {
    return { ok: false, error: `Reset link is ${result.reason}`, status: 400 };
  }

  const passwordHash = await bcrypt.hash(parsed.data, 10);
  await db.user.update({
    where: { id: result.userId },
    // A working reset link proves mailbox ownership — count it as verification.
    data: { passwordHash, emailVerified: new Date() },
  });
  return { ok: true };
}
