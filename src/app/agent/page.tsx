import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAgentDashboard } from "@/services/agents/agentDashboard";
import { PortalEmpty, PortalSection, StatCard } from "@/components/portal/PortalShell";

// Middleware-gated, always per-request — never statically prerendered.
export const dynamic = "force-dynamic";

/**
 * The agent portal's front door (ADR-016). It replaced a bare
 * `redirect("/agent/listings")`, which left the portal with no home and no
 * overview.
 *
 * `requireRole` again despite the middleware gate: the middleware reads the JWT
 * at the edge and is a routing concern, while this is the server-side check
 * AGENTS.md requires on anything that reads a user's own data.
 */
export default async function AgentHomePage() {
  // The middleware already gated this route on the JWT at the edge; this is the
  // server-side check AGENTS.md requires before reading a user's own data, and
  // it is what narrows `session.user` for the query below.
  const session = await auth();
  const user = session?.user;
  if (!user) redirect("/login");
  if (!["AGENT", "ADMIN"].includes(user.role)) redirect("/403");
  const data = await getAgentDashboard(user.id);

  return (
    <>
      <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={data.liveListings} label="Live listings" />
        <StatCard
          value={data.pendingListings}
          label="Awaiting review"
          hint={data.pendingListings > 0 ? "With the moderation queue" : undefined}
        />
        <StatCard value={data.draftListings} label="Drafts" />
        <StatCard
          value={data.newLeads}
          label="New leads"
          hint={data.newLeads > 0 ? "Unactioned enquiries" : undefined}
        />
      </div>

      <PortalSection
        title="Latest leads"
        action={
          <Link
            href="/agent/leads"
            className="text-sm font-semibold text-primary underline decoration-line underline-offset-4 hover:decoration-accent"
          >
            All leads
          </Link>
        }
      >
        {data.recentLeads.length === 0 ? (
          <PortalEmpty>
            No enquiries yet. Leads appear here the moment a buyer contacts you about a
            live listing.
          </PortalEmpty>
        ) : (
          <ul className="border-t border-line">
            {data.recentLeads.map((lead) => (
              <li
                key={lead.id}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-4"
              >
                <Link
                  href={`/marketplace/${lead.propertyId}`}
                  className="font-medium text-primary underline decoration-line underline-offset-4 hover:decoration-accent"
                >
                  {lead.propertyTitle}
                </Link>
                <span className="text-xs tracking-[0.12em] text-muted uppercase">
                  {lead.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PortalSection>

      <PortalSection title="Verified record">
        <p className="text-sm leading-relaxed text-muted">
          {data.verifiedDealCount === 0
            ? "No completed deals recorded yet. Deals completed on-platform are added to your public profile automatically."
            : `${data.verifiedDealCount} completed ${data.verifiedDealCount === 1 ? "deal" : "deals"} recorded against your profile.`}
        </p>
      </PortalSection>
    </>
  );
}
