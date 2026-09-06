import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { formatPenceGBP } from "@/services/metrics/globalMetrics";
import { getInvestorDashboard } from "@/services/syndicates/investorDashboard";
import { PortalEmpty, PortalSection, StatCard } from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

/** KYC states that let an investor act, and the copy for the ones that do not. */
const KYC_COPY: Record<string, { tone: string; text: string }> = {
  NOT_STARTED: {
    tone: "bg-warning/10 text-warning",
    text: "Identity verification not started. It is required before you can register an expression of interest in any syndicate.",
  },
  PENDING: {
    tone: "bg-warning/10 text-warning",
    text: "Identity verification in progress. You will be able to register expressions of interest once it clears.",
  },
  APPROVED: {
    tone: "bg-success/15 text-success",
    text: "Identity verified. You can register expressions of interest in open syndicates.",
  },
  REJECTED: {
    tone: "bg-danger/15 text-danger",
    text: "Identity verification was not accepted. Contact support to resolve it.",
  },
};

export default async function InvestorPage() {
  // The middleware already gated this route on the JWT at the edge; this is the
  // server-side check AGENTS.md requires before reading a user's own data, and
  // it is what narrows `session.user` for the query below.
  const session = await auth();
  const user = session?.user;
  if (!user) redirect("/login");
  if (!["INVESTOR", "ADMIN"].includes(user.role)) redirect("/403");
  const data = await getInvestorDashboard(user.id);
  const kyc = KYC_COPY[data.kycStatus] ?? KYC_COPY.NOT_STARTED;

  return (
    <>
      {/* The EOI position is a compliance statement, not marketing copy — it
          belongs above the numbers, not in a footnote (docs/CONTEXT.md §1). */}
      <p
        data-testid="eoi-notice"
        className="rounded-xl border border-line bg-surface px-5 py-4 text-sm leading-relaxed text-muted"
      >
        Syndicate participation is currently <strong>expression-of-interest only</strong>
        {" — "}no funds are collected on-platform and no pledge here is a payment or a
        binding commitment.
      </p>

      <div
        data-testid="kyc-card"
        className={`mt-6 rounded-xl px-5 py-4 text-sm leading-relaxed ${kyc.tone}`}
      >
        {kyc.text}
      </div>

      <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          value={formatPenceGBP(data.summary.committedGBP)}
          label="Committed intent"
          hint="Pledged, not paid"
        />
        <StatCard value={data.summary.projectCount} label="Syndicates" />
        <StatCard value={data.summary.pledgeCount} label="Pledges" />
        <StatCard value={data.savedCount} label="Saved properties" />
      </div>

      <PortalSection title="Your pledges">
        {data.pledges.length === 0 ? (
          <PortalEmpty>
            No expressions of interest yet. Open syndicates appear here once you have
            registered an interest in one.
          </PortalEmpty>
        ) : (
          <ul className="border-t border-line">
            {data.pledges.map((p) => (
              <li key={p.id} className="border-b border-line py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <p className="font-medium text-primary">{p.project.name}</p>
                  <p className="text-sm text-muted">
                    {formatPenceGBP(p.amountGBP)} · {p.equityPct}% equity
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted">{p.project.propertyTitle}</p>

                {/* Funding bar: the syndicate's progress, not this pledge's. */}
                <div className="mt-3 flex items-center gap-3">
                  <span
                    aria-hidden
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-pale"
                  >
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${p.project.fundedPct}%` }}
                    />
                  </span>
                  <span className="text-xs tabular-nums text-muted">
                    {p.project.fundedPct}% of {formatPenceGBP(p.project.capitalTargetGBP)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PortalSection>

      <PortalSection
        title="Find stock"
        action={
          <Link
            href="/marketplace"
            className="text-sm font-semibold text-primary underline decoration-line underline-offset-4 hover:decoration-accent"
          >
            Browse the marketplace
          </Link>
        }
      >
        <p className="text-sm leading-relaxed text-muted">
          Every listing carries its disclosed defects, EPC rating and the agent&apos;s
          target refurbishment ROI.
        </p>
      </PortalSection>
    </>
  );
}
