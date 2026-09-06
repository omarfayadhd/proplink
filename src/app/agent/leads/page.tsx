import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import {
  ACTIVE_AGENT_PROFILE_COOKIE,
  resolveActiveAgentProfileId,
} from "@/lib/activeAgentProfile";
import { listActiveAgentProfiles } from "@/services/listings/listingService";
import { getAgentProfileAnalytics } from "@/services/listings/analytics";
import { listEnquiriesForAgentProfile } from "@/services/enquiries/enquiryService";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { LeadsTable, type LeadRow } from "@/components/agents/LeadsTable";

export const metadata = { title: "Agent — Leads" };

/**
 * Agent leads & analytics (Task 2.6). Scoped to the nav's **active** agency
 * profile rather than every profile the user owns — an agent working as one
 * agency shouldn't see another's leads mixed in, and the analytics strip would
 * be meaningless summed across agencies. `listEnquiriesForAgentProfile`
 * re-verifies ownership server-side; the cookie is only ever a hint.
 */
export default async function AgentLeadsPage() {
  const session = await auth();
  if (!session?.user) {
    return <p className="text-sm text-muted">Log in as an agent to see your leads.</p>;
  }

  const profiles = await listActiveAgentProfiles(session.user.id);
  const activeId = resolveActiveAgentProfileId(
    profiles,
    (await cookies()).get(ACTIVE_AGENT_PROFILE_COOKIE)?.value,
  );

  if (!activeId) {
    return (
      <p className="text-sm text-muted">
        You don&apos;t have an agency profile yet — contact an admin.
      </p>
    );
  }

  const [analytics, enquiries] = await Promise.all([
    getAgentProfileAnalytics(activeId),
    listEnquiriesForAgentProfile({
      agentProfileId: activeId,
      agentUserId: session.user.id,
    }),
  ]);

  const leads: LeadRow[] = enquiries.map((e) => ({
    id: e.id,
    message: e.message,
    status: e.status,
    createdAt: e.createdAt.toISOString(),
    fromName: e.from.name,
    fromEmail: e.from.email,
    propertyId: e.property.id,
    propertyTitle: e.property.title,
  }));

  const stats = [
    { key: "listings", label: "Listings", value: analytics.listings },
    { key: "views", label: "Listing views", value: analytics.views },
    { key: "saves", label: "Saves", value: analytics.saves },
    { key: "leads", label: "Enquiries", value: analytics.leads },
    { key: "new-leads", label: "New (unactioned)", value: analytics.newLeads },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.key}>
            <CardTitle>{s.label}</CardTitle>
            <CardBody>
              <p
                className="text-2xl font-bold text-primary"
                data-testid={`analytics-${s.key}`}
              >
                {s.value}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <LeadsTable leads={leads} />
    </div>
  );
}
