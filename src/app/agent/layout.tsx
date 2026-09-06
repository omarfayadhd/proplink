import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { listActiveAgentProfiles } from "@/services/listings/listingService";
import { ActiveProfileSwitcher } from "@/components/agents/ActiveProfileSwitcher";
import { PortalShell } from "@/components/portal/PortalShell";
import { AGENT_NAV } from "@/app/agent/nav";
import {
  ACTIVE_AGENT_PROFILE_COOKIE,
  resolveActiveAgentProfileId,
} from "@/lib/activeAgentProfile";

/**
 * The agent portal's frame (ADR-016). Role gating is `src/middleware.ts`
 * (AGENT/ADMIN) plus per-action `requireRole`.
 *
 * It carries the portal's single `<h1>` and its sub-nav, so every page below
 * contributes `<h2>`s only. The profile switcher rides on the masthead as
 * `aside` — an agent can hold several agency profiles and needs to see which one
 * the page is showing without leaving it.
 */
export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const profiles = session?.user ? await listActiveAgentProfiles(session.user.id) : [];
  const cookieStore = await cookies();
  const activeId = resolveActiveAgentProfileId(
    profiles,
    cookieStore.get(ACTIVE_AGENT_PROFILE_COOKIE)?.value,
  );

  return (
    <PortalShell
      eyebrow="Agent portal"
      title="Your stock,"
      titleTail="your record"
      nav={AGENT_NAV}
      aside={
        profiles.length > 1 && activeId ? (
          <ActiveProfileSwitcher
            profiles={profiles.map((p) => ({ id: p.id, agencyName: p.agencyName }))}
            activeId={activeId}
          />
        ) : profiles.length === 1 ? (
          <span className="text-sm font-medium text-pale/75">
            {profiles[0].agencyName}
          </span>
        ) : null
      }
    >
      {children}
    </PortalShell>
  );
}
