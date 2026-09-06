/**
 * Investor portfolio maths (ADR-016).
 *
 * Pure and DOM-free, so the arithmetic an investor's dashboard puts in front of
 * them is unit-tested rather than eyeballed. Money is integer pence throughout
 * (AGENTS.md § non-negotiables) — every `*GBP` value here is pence, never a
 * float, and no rounding happens on money.
 *
 * **EOI mode.** Nothing here is a balance. A pledge records intent and no money
 * has moved (`SYNDICATE_PAYMENTS_ENABLED=false`, docs/CONTEXT.md), so
 * "committed" means committed *intent* and the dashboard must say so.
 */

/** A pledge, trimmed to the fields the maths needs. */
export interface PortfolioPledge {
  amountGBP: number;
  /** `PledgeStatus`. Anything withdrawn stops counting. */
  status: string;
  projectId: string;
  project: { capitalTargetGBP: number };
}

export interface PortfolioSummary {
  /** Sum of standing pledges, in pence. */
  committedGBP: number;
  pledgeCount: number;
  projectCount: number;
}

/** A pledge no longer standing — excluded from every total. */
const isStanding = (p: PortfolioPledge) => p.status !== "WITHDRAWN";

/**
 * A pledge's share of its project's capital target, as a percentage.
 *
 * Quoted to one decimal because that is how equity is *stated*; the underlying
 * pence are never rounded. Clamped to 100: over-pledging past the target is a
 * data error, and an investor should never be shown a 150% holding.
 */
export function equityPct(amountGBP: number, capitalTargetGBP: number): number {
  if (!(capitalTargetGBP > 0)) return 0;
  const pct = (amountGBP / capitalTargetGBP) * 100;
  return Math.round(Math.min(pct, 100) * 10) / 10;
}

/**
 * Portfolio totals across an investor's pledges.
 *
 * The empty result is the common case, not an edge case — a newly registered
 * investor lands on this dashboard before pledging anything.
 */
export function summarisePortfolio(pledges: PortfolioPledge[]): PortfolioSummary {
  const standing = pledges.filter(isStanding);

  return {
    committedGBP: standing.reduce((sum, p) => sum + p.amountGBP, 0),
    pledgeCount: standing.length,
    // Distinct, not per-pledge: an investor can top up the same syndicate more
    // than once, and that is one holding rather than two.
    projectCount: new Set(standing.map((p) => p.projectId)).size,
  };
}
