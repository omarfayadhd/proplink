import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { listActiveAgentProfiles } from "@/services/listings/listingService";
import { ActiveProfileSwitcher } from "@/components/agents/ActiveProfileSwitcher";
import {
  ACTIVE_AGENT_PROFILE_COOKIE,
  resolveActiveAgentProfileId,
} from "@/lib/activeAgentProfile";

// Role gating happens in src/middleware.ts (AGENT/ADMIN) + per-action requireRole.
const TABS = [
  { href: "/agent/listings", label: "Listings" },
  { href: "/agent/leads", label: "Leads" },
  { href: "/agent/profile", label: "Profile" },
];

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const profiles = session?.user ? await listActiveAgentProfiles(session.user.id) : [];
  const cookieStore = await cookies();
  const activeId = resolveActiveAgentProfileId(
    profiles,
    cookieStore.get(ACTIVE_AGENT_PROFILE_COOKIE)?.value,
  );

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Agent portal</h1>
        {profiles.length > 1 && activeId && (
          <ActiveProfileSwitcher
            profiles={profiles.map((p) => ({ id: p.id, agencyName: p.agencyName }))}
            activeId={activeId}
          />
        )}
        {profiles.length === 1 && (
          <span className="text-sm font-medium text-muted">{profiles[0].agencyName}</span>
        )}
      </div>
      <nav className="mt-4 flex gap-1 border-b border-line text-sm font-medium">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-t-md px-4 py-2 text-secondary hover:bg-pale hover:text-primary"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="py-6">{children}</div>
    </div>
  );
}
