import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma/enums";
import { requestEmailVerification } from "@/services/users/emailVerification";

// Admin and agent accounts are created via seed/admin tooling only — never
// self-serve. Agents are vetted before they can list distressed stock, so the
// role is provisioned manually from the backend (ADR-018).
export const SELF_SERVE_ROLES = [Role.INVESTOR, Role.BUYER] as const;

export const registrationSchema = z.object({
  email: z.email("Enter a valid email address").transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number"),
  name: z.string().trim().min(2, "Enter your full name").max(100),
  role: z.enum(SELF_SERVE_ROLES),
  gdprConsent: z.literal(true, {
    error: "You must accept the privacy policy to register",
  }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export type RegistrationResult =
  { ok: true; userId: string } | { ok: false; error: string; status: number };

export async function registerUser(
  input: RegistrationInput,
): Promise<RegistrationResult> {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) {
    return { ok: false, error: "An account with this email already exists", status: 409 };
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await db.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
      gdprConsentAt: new Date(),
    },
  });

  // Fire-and-forget: registration must not fail if the mailer is down.
  requestEmailVerification(user.id).catch((err) =>
    console.error("verification email failed:", err),
  );

  return { ok: true, userId: user.id };
}
