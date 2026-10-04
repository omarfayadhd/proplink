import { z } from "zod";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma/enums";
import { writeAudit } from "@/services/admin/audit";
import { createToken } from "@/services/users/verificationTokens";
import { agentInviteUrl, sendAgentInviteEmail } from "@/services/email/mailer";

/**
 * Agent accounts are provisioned by an admin, never self-serve (ADR-018), so
 * this is the only route that mints `Role.AGENT`.
 *
 * No password field: the admin never handles the agent's credential. The
 * account is created with `passwordHash: null` — unusable for credentials
 * sign-in — and the agent sets their own from the emailed invite.
 */
export const createAgentSchema = z.object({
  name: z.string().trim().min(2, "Enter the agent's full name").max(100),
  email: z.email("Enter a valid email address").transform((v) => v.toLowerCase()),
  agencyName: z.string().trim().min(2, "Enter the agency name").max(120),
  // Deliberately format-free: UK agent compliance codes vary by scheme, and a
  // guessed regex would reject valid ones. Uniqueness is the real constraint.
  complianceCode: z.string().trim().min(1, "Enter the compliance code").max(60),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;

export type CreateAgentResult =
  | { ok: true; userId: string; inviteUrl: string }
  | { ok: false; error: string; status: number };

export async function createAgent(
  params: { actorUserId: string } & Record<string, unknown>,
): Promise<CreateAgentResult> {
  const parsed = createAgentSchema.safeParse(params);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, status: 400 };
  }
  const input = parsed.data;

  if (await db.user.findUnique({ where: { email: input.email } })) {
    return { ok: false, error: "An account with this email already exists", status: 409 };
  }
  if (
    await db.agentProfile.findUnique({
      where: { complianceCode: input.complianceCode },
    })
  ) {
    return { ok: false, error: "That compliance code is already in use", status: 409 };
  }

  // One transaction: an AGENT with no AgentProfile has no agency to list under,
  // so a half-created agent is not a state worth persisting.
  const userId = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: Role.AGENT,
        // Set from the invite link, not here — the admin never sees it.
        passwordHash: null,
      },
    });
    await tx.agentProfile.create({
      data: {
        userId: user.id,
        agencyName: input.agencyName,
        complianceCode: input.complianceCode,
      },
    });
    return user.id;
  });

  const token = await createToken(userId, "AGENT_INVITE");
  // Awaited, unlike `registerUser`'s fire-and-forget verification mail: an
  // admin needs to know whether the invite actually went out, and the fallback
  // (the returned link) is only useful if this resolved.
  await sendAgentInviteEmail(input.email, token);

  await writeAudit({
    actorUserId: params.actorUserId,
    action: "AGENT_CREATED",
    entity: "User",
    entityId: userId,
    meta: { email: input.email, agencyName: input.agencyName },
  });

  return { ok: true, userId, inviteUrl: agentInviteUrl(token) };
}

/** True while the console-only mock mailer is active (H1.7 not yet supplied). */
export function mailerIsConsoleOnly(): boolean {
  return !process.env.RESEND_API_KEY;
}
