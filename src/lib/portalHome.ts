import type { Role } from "@/generated/prisma/enums";

/**
 * The portal each role owns (ADR-016).
 *
 * One map, used by the post-login redirect, the post-registration redirect and
 * the header's single signed-in link — so a role can never be sent somewhere its
 * middleware gate will bounce it from, and the three cannot drift apart.
 */
export const PORTAL_HOME: Record<Role, string> = {
  AGENT: "/agent",
  INVESTOR: "/investor",
  BUYER: "/buy",
  ADMIN: "/admin",
};

/** Human label for the same, for the header link. */
export const PORTAL_LABEL: Record<Role, string> = {
  AGENT: "Agent portal",
  INVESTOR: "Investor portal",
  BUYER: "Buyer portal",
  ADMIN: "Admin",
};
