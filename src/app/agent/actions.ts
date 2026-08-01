"use server";

import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { listActiveAgentProfiles } from "@/services/listings/listingService";
import { ACTIVE_AGENT_PROFILE_COOKIE } from "@/lib/activeAgentProfile";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Persists the agent nav's "active profile" selection. Server-verified, not
 * trusted from the client: re-fetches the caller's own active `AgentProfile`s
 * (same `listActiveAgentProfiles` the listing wizard's picker and the
 * ownership gate in `listingService.createDraft` both use) and silently
 * no-ops for anything that isn't in that list — a stale/tampered cookie value
 * is simply never written, so `resolveActiveAgentProfileId` always falls
 * back to the first owned profile instead.
 */
export async function setActiveAgentProfile(agentProfileId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) return;

  const profiles = await listActiveAgentProfiles(session.user.id);
  if (!profiles.some((p) => p.id === agentProfileId)) return;

  const store = await cookies();
  store.set(ACTIVE_AGENT_PROFILE_COOKIE, agentProfileId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
}
