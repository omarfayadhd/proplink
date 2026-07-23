import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/services/email/mailer";
import { consumeToken, createToken } from "@/services/users/verificationTokens";

export async function requestEmailVerification(userId: string): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.emailVerified) return;
  const token = await createToken(userId, "EMAIL_VERIFY");
  await sendVerificationEmail(user.email, token);
}

export type VerifyEmailResult = { ok: true } | { ok: false; reason: string };

export async function verifyEmail(rawToken: string): Promise<VerifyEmailResult> {
  const result = await consumeToken(rawToken, "EMAIL_VERIFY");
  if (!result.ok) return { ok: false, reason: result.reason };

  await db.user.update({
    where: { id: result.userId },
    data: { emailVerified: new Date() },
  });
  return { ok: true };
}
