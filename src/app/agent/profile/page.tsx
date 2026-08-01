import Link from "next/link";
import { auth } from "@/lib/auth";
import { listActiveAgentProfiles } from "@/services/listings/listingService";
import { listCaseStudiesForOwnedProfile } from "@/services/agents/agentProfileService";
import { CaseStudyManager } from "@/components/agents/CaseStudyManager";

export const metadata = { title: "Agent — Profile" };

/**
 * Agency credibility hub management (Task 2.4): one card per `AgentProfile`
 * the signed-in agent owns, each with a link to its public `/agents/[id]`
 * page and a `CaseStudyManager` for that profile's case studies (capex/net
 * margin/narrative). Star rating, verified deal count and investor
 * appraisals are read-only aggregates shown on the public page, not here.
 */
export default async function AgentPortalProfilePage() {
  const session = await auth();
  if (!session?.user) {
    return (
      <p className="text-sm text-muted">
        Log in as an agent to manage your agency profiles.
      </p>
    );
  }
  const userId = session.user.id;

  const profiles = await listActiveAgentProfiles(userId);

  if (profiles.length === 0) {
    return (
      <p className="text-sm text-muted">
        You don&apos;t have an agency profile yet — contact an admin.
      </p>
    );
  }

  const caseStudiesByProfile = await Promise.all(
    profiles.map((p) => listCaseStudiesForOwnedProfile({ userId, agentProfileId: p.id })),
  );

  return (
    <div className="space-y-8">
      {profiles.map((profile, i) => (
        <section
          key={profile.id}
          data-testid={`agent-profile-card-${profile.id}`}
          className="rounded-lg border border-line bg-white p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-primary">{profile.agencyName}</h2>
              <p className="text-xs text-muted">
                Compliance code: {profile.complianceCode}
              </p>
            </div>
            <Link
              href={`/agents/${profile.id}`}
              className="text-sm font-medium text-accent hover:underline"
            >
              View public profile
            </Link>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-secondary">Case studies</h3>
            <div className="mt-2">
              <CaseStudyManager
                agentProfileId={profile.id}
                caseStudies={caseStudiesByProfile[i].map((cs) => ({
                  id: cs.id,
                  title: cs.title,
                  capexGBP: cs.capexGBP,
                  netMarginGBP: cs.netMarginGBP,
                  description: cs.description,
                  imageUrl: cs.imageUrl,
                }))}
              />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
