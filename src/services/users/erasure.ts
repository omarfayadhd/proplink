import { db } from "@/lib/db";

/**
 * GDPR right-to-erasure: anonymises the User row in place.
 * KycRecord rows are DELIBERATELY preserved (UK AML: 5-year retention,
 * docs/CONTEXT.md §compliance) — they end up linked to an anonymised shell.
 */
export async function eraseUser(userId: string): Promise<{ ok: boolean }> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false };

  await db.user.update({
    where: { id: userId },
    data: {
      email: `erased-${userId}@anonymised.invalid`,
      name: "Erased User",
      passwordHash: null,
      avatarUrl: null,
      complianceCode: null,
      gdprConsentAt: null,
      active: false,
      emailVerified: null,
    },
  });

  // Tokens are PII-adjacent and now useless.
  await db.verificationToken.deleteMany({ where: { userId } });

  return { ok: true };
}
