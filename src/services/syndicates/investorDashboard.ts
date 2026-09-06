import "server-only";
import { db } from "@/lib/db";
import {
  equityPct,
  summarisePortfolio,
  type PortfolioSummary,
} from "@/services/syndicates/portfolio";

/**
 * Read side of the investor portal (ADR-016, sprint plan Task 4.4).
 *
 * **Read-only by design.** Pledging is Sprint 4 work and is gated on the KYC
 * check and on `SYNDICATE_PAYMENTS_ENABLED` staying false; nothing here writes,
 * so the dashboard cannot become a back door into a regulated action.
 *
 * Every `*GBP` value is integer pence (AGENTS.md § non-negotiables).
 */

export interface InvestorPledgeRow {
  id: string;
  amountGBP: number;
  status: string;
  createdAt: Date;
  /** This pledge's share of the project's capital target, 0–100, one decimal. */
  equityPct: number;
  project: {
    id: string;
    name: string;
    status: string;
    capitalTargetGBP: number;
    /** Everything standing on the project, not just this investor's share. */
    pledgedGBP: number;
    /** Funding progress as a percentage of target, clamped to 100. */
    fundedPct: number;
    propertyTitle: string;
  };
}

export interface InvestorDashboard {
  kycStatus: string;
  pledges: InvestorPledgeRow[];
  summary: PortfolioSummary;
  savedCount: number;
}

export async function getInvestorDashboard(userId: string): Promise<InvestorDashboard> {
  const [user, pledges, savedCount] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { kycStatus: true } }),
    db.syndicatePledge.findMany({
      where: { investorUserId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          include: {
            property: { select: { title: true } },
            // Every standing pledge on the project, so the funding bar shows the
            // syndicate's progress rather than only this investor's share.
            pledges: { select: { amountGBP: true, status: true } },
          },
        },
      },
    }),
    db.savedProperty.count({ where: { userId } }),
  ]);

  const rows: InvestorPledgeRow[] = pledges.map((p) => {
    const pledgedGBP = p.project.pledges
      .filter((x) => x.status !== "WITHDRAWN")
      .reduce((sum, x) => sum + x.amountGBP, 0);

    return {
      id: p.id,
      amountGBP: p.amountGBP,
      status: p.status,
      createdAt: p.createdAt,
      equityPct: equityPct(p.amountGBP, p.project.capitalTargetGBP),
      project: {
        id: p.project.id,
        name: p.project.name,
        status: p.project.status,
        capitalTargetGBP: p.project.capitalTargetGBP,
        pledgedGBP,
        fundedPct: equityPct(pledgedGBP, p.project.capitalTargetGBP),
        propertyTitle: p.project.property.title,
      },
    };
  });

  return {
    kycStatus: user?.kycStatus ?? "NOT_STARTED",
    pledges: rows,
    summary: summarisePortfolio(
      pledges.map((p) => ({
        amountGBP: p.amountGBP,
        status: p.status,
        projectId: p.projectId,
        project: { capitalTargetGBP: p.project.capitalTargetGBP },
      })),
    ),
    savedCount,
  };
}
