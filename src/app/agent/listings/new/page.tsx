import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { listActiveAgentProfiles } from "@/services/listings/listingService";
import { ListingWizard } from "@/components/listings/ListingWizard";
import { emptyWizardState } from "@/components/listings/wizardTypes";
import {
  ACTIVE_AGENT_PROFILE_COOKIE,
  resolveActiveAgentProfileId,
} from "@/lib/activeAgentProfile";

export const metadata = { title: "Agent — New listing" };

export default async function NewListingPage() {
  const session = await auth();
  const profiles = session?.user ? await listActiveAgentProfiles(session.user.id) : [];

  if (profiles.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-white p-6 text-sm text-body">
        <p className="font-semibold text-primary">No agency profile yet</p>
        <p className="mt-1 text-muted">
          You need an active agency profile before you can create a listing. Agency
          profile management arrives with Task 2.4 — until then, contact an admin.
        </p>
        <Link href="/agent" className="mt-3 inline-block text-accent underline">
          Back to agent portal
        </Link>
      </div>
    );
  }

  // Defaults to the agent nav's active-profile selection (Task 2.4); still
  // overridable per-listing via the wizard's own picker (`ListingWizard`,
  // Task 2.2) when the agent owns more than one profile.
  const cookieStore = await cookies();
  const activeId =
    resolveActiveAgentProfileId(
      profiles,
      cookieStore.get(ACTIVE_AGENT_PROFILE_COOKIE)?.value,
    ) ?? profiles[0].id;

  return (
    <ListingWizard
      agentProfiles={profiles.map((p) => ({ id: p.id, agencyName: p.agencyName }))}
      initial={emptyWizardState(activeId)}
    />
  );
}
