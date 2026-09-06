import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getAgentProfilePublic,
  getAppraisalEligibility,
} from "@/services/agents/agentProfileService";
import { formatPenceGBP } from "@/components/listings/wizardTypes";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { AppraisalForm } from "@/components/agents/AppraisalForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const profile = await getAgentProfilePublic(id);
  return { title: profile ? `${profile.agencyName} — PropLink UK` : "Agent not found" };
}

/**
 * Public agent profile & credibility hub (Task 2.4 brief): agency info, star
 * rating (average of `Appraisal.rating`), Verified Completed Deals (count of
 * SOLD listings), compliance code, case studies (capex/net margin/narrative)
 * and investor appraisals — with a review form for logged-in users the
 * server has confirmed are qualified (prior Enquiry/Deal, not already
 * reviewed, INVESTOR/BUYER role). No auth required to view the page itself.
 */
export default async function AgentProfilePage({ params }: PageProps) {
  const { id } = await params;
  const profile = await getAgentProfilePublic(id);
  if (!profile) notFound();

  const session = await auth();
  const eligibility = session?.user
    ? await getAppraisalEligibility({
        userId: session.user.id,
        role: session.user.role,
        agentProfileId: id,
      })
    : null;

  return (
    // `<main>` for the same reason as `/marketplace/[id]`: the other publicly
    // indexed page in Sprint 2, so it needs the landmark too. The
    // authenticated `/agent/**` and `/admin/**` pages still use plain `<div>`
    // wrappers — same defect, but noindex and behind auth; queued for the
    // Sprint 6 hardening pass rather than fixed piecemeal here.
    <main className="mx-auto w-full max-w-4xl space-y-8 px-6 py-10">
      <div className="flex items-start gap-4">
        <div
          aria-hidden
          className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-accent/10 text-2xl font-bold text-accent"
        >
          {profile.agencyName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary">{profile.agencyName}</h1>
          {profile.bio && <p className="mt-1 text-sm text-body">{profile.bio}</p>}
          <p className="mt-1 text-xs font-medium text-muted">
            Compliance code: {profile.complianceCode}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>Investor rating</CardTitle>
          <CardBody>
            {profile.ratingCount > 0 ? (
              <p
                className="text-lg font-semibold text-primary"
                data-testid="agent-rating"
              >
                ★ {profile.ratingAverage?.toFixed(1)}{" "}
                <span className="text-sm font-normal text-muted">
                  ({profile.ratingCount} review{profile.ratingCount === 1 ? "" : "s"})
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted">No reviews yet</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardTitle>Verified completed deals</CardTitle>
          <CardBody>
            <p
              className="text-lg font-semibold text-primary"
              data-testid="verified-deal-count"
            >
              {profile.verifiedDealCount}
            </p>
          </CardBody>
        </Card>
      </div>

      <section>
        <h2 className="text-lg font-bold text-primary">Case studies</h2>
        {profile.caseStudies.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No case studies published yet.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {profile.caseStudies.map((c) => (
              <Card key={c.id} data-testid="case-study-card">
                <CardTitle>{c.title}</CardTitle>
                <CardBody>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-muted">Capex</dt>
                      <dd
                        className="font-semibold text-body"
                        data-testid="case-study-capex"
                      >
                        {formatPenceGBP(c.capexGBP)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Net margin</dt>
                      <dd
                        className="font-semibold text-body"
                        data-testid="case-study-net-margin"
                      >
                        {formatPenceGBP(c.netMarginGBP)}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-body">{c.description}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-primary">Investor appraisals</h2>

        <div className="mt-3">
          {!session?.user && (
            <p className="text-sm text-muted">
              <Link href="/login" className="text-accent underline">
                Log in
              </Link>{" "}
              as a qualified investor or buyer to leave a review.
            </p>
          )}
          {session?.user && eligibility && !eligibility.eligible && (
            <p className="text-sm text-muted" data-testid="appraisal-ineligible-reason">
              {eligibility.reason === "WRONG_ROLE" &&
                "Only investors and buyers who have engaged with this agency can leave a review."}
              {eligibility.reason === "NOT_QUALIFIED" &&
                "You need to have made an enquiry or been party to a deal on one of this agency's listings before you can review it."}
              {eligibility.reason === "ALREADY_REVIEWED" &&
                "You've already reviewed this agency — thank you."}
            </p>
          )}
          {session?.user && eligibility?.eligible && (
            <AppraisalForm agentProfileId={profile.id} />
          )}
        </div>

        {profile.appraisals.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No appraisals yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {profile.appraisals.map((a) => (
              <li key={a.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-primary">
                    ★ {a.rating}/5 — {a.reviewerName}
                  </span>
                  <span className="text-xs text-muted">
                    {a.createdAt.toISOString().slice(0, 10)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-body">{a.review}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
