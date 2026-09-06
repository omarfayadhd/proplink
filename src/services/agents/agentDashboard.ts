import "server-only";
import { db } from "@/lib/db";

/**
 * Read side of the agent portal's home (ADR-016).
 *
 * `/agent` used to redirect straight to `/agent/listings`, so an agent had a
 * portal with no front door. This is that front door: counts and the most
 * recent leads, each linking on to the page that already owns the detail.
 *
 * Scoped to the agent's own profile in the query. An agent must never see
 * another agency's listings or leads, and the `where` is where that is enforced
 * rather than in the page.
 */

export interface AgentDashboard {
  agencyName: string | null;
  verifiedDealCount: number;
  liveListings: number;
  draftListings: number;
  pendingListings: number;
  /** Enquiries against this agent's stock that nobody has actioned yet. */
  newLeads: number;
  recentLeads: {
    id: string;
    propertyId: string;
    propertyTitle: string;
    createdAt: Date;
    status: string;
  }[];
}

/** How many leads the home shows before deferring to `/agent/leads`. */
const PREVIEW = 5;

export async function getAgentDashboard(userId: string): Promise<AgentDashboard> {
  const profile = await db.agentProfile.findFirst({
    where: { userId, active: true },
    select: { id: true, agencyName: true, verifiedDealCount: true },
  });

  // An agent can exist before their profile does — the wizard creates it. Show
  // an honest empty dashboard rather than throwing them at a 500.
  if (!profile) {
    return {
      agencyName: null,
      verifiedDealCount: 0,
      liveListings: 0,
      draftListings: 0,
      pendingListings: 0,
      newLeads: 0,
      recentLeads: [],
    };
  }

  const owned = { agentProfileId: profile.id };

  const [liveListings, draftListings, pendingListings, newLeads, recentLeads] =
    await Promise.all([
      db.property.count({ where: { ...owned, status: "LIVE" } }),
      db.property.count({ where: { ...owned, status: "DRAFT" } }),
      db.property.count({ where: { ...owned, status: "PENDING_REVIEW" } }),
      db.enquiry.count({ where: { property: owned, status: "NEW" } }),
      db.enquiry.findMany({
        where: { property: owned },
        orderBy: { createdAt: "desc" },
        take: PREVIEW,
        include: { property: { select: { title: true } } },
      }),
    ]);

  return {
    agencyName: profile.agencyName,
    verifiedDealCount: profile.verifiedDealCount,
    liveListings,
    draftListings,
    pendingListings,
    newLeads,
    recentLeads: recentLeads.map((e) => ({
      id: e.id,
      propertyId: e.propertyId,
      propertyTitle: e.property.title,
      createdAt: e.createdAt,
      status: e.status,
    })),
  };
}
