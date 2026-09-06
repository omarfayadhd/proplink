import { db } from "@/lib/db";
import { cached } from "@/lib/redis";

export interface GlobalMetrics {
  /** Sum of asking prices of LIVE listings, in pence. */
  totalDistressInventoryGBP: number;
  completedSyndicateDeals: number;
  /** Success fees including VAT, in pence. */
  accruedSuccessFeesGBP: number;
  /** Partner click-throughs routed via the ecosystem directory. */
  vettedReferralsRouted: number;
}

async function compute(): Promise<GlobalMetrics> {
  const [inventory, completedDeals, fees, referrals] = await Promise.all([
    db.property.aggregate({
      where: { status: "LIVE" },
      _sum: { askingPriceGBP: true },
    }),
    db.syndicateProject.count({ where: { status: "COMPLETED" } }),
    db.successFee.aggregate({ _sum: { amountGBP: true, vatGBP: true } }),
    db.partner.aggregate({ _sum: { clickCount: true } }),
  ]);

  return {
    totalDistressInventoryGBP: inventory._sum.askingPriceGBP ?? 0,
    completedSyndicateDeals: completedDeals,
    accruedSuccessFeesGBP: (fees._sum.amountGBP ?? 0) + (fees._sum.vatGBP ?? 0),
    vettedReferralsRouted: referrals._sum.clickCount ?? 0,
  };
}

/** Server-computed, cached 60s (sprint plan, Task 1.5). */
export async function getGlobalMetrics(): Promise<GlobalMetrics> {
  return cached("metrics:global", 60, compute);
}

/** £ formatting for pence values: whole pounds, thousands separators. */
export function formatPenceGBP(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(pence / 100);
}

/**
 * Headline figures for the marketing landing hero (Task 3.6). Separate from
 * `GlobalMetrics` because that shape is the sprint plan's fixed four-metric
 * contract (docs/PropLink_Sprint_Plan_Claude_Code.md, Task 1.5) — the hero
 * needs live-supply figures that read well before any syndicate has completed,
 * and widening `GlobalMetrics` would change what every consumer of the strip
 * means by it.
 */
export interface LandingStats {
  /** Number of listings currently visible in the marketplace. */
  liveListings: number;
  /** Mean agent-declared target refurbishment ROI, or null if none declared. */
  avgTargetRoiPct: number | null;
}

async function computeLandingStats(): Promise<LandingStats> {
  const [liveListings, roi] = await Promise.all([
    db.property.count({ where: { status: "LIVE" } }),
    db.property.aggregate({
      where: { status: "LIVE", targetRoiPct: { not: null } },
      _avg: { targetRoiPct: true },
    }),
  ]);

  const avg = roi._avg.targetRoiPct;
  return {
    liveListings,
    avgTargetRoiPct: avg == null ? null : Math.round(avg),
  };
}

/** Server-computed, cached 60s — same TTL as the global metrics. */
export async function getLandingStats(): Promise<LandingStats> {
  return cached("metrics:landing", 60, computeLandingStats);
}

/**
 * Compact £ for hero-sized numbers: pence → "£5.87M" / "£412k" / "£950".
 * The full `formatPenceGBP` value stays available as a `title` attribute, so
 * nothing is lost by abbreviating — a 9-figure inventory sum rendered in full
 * at hero type size wraps and stops being readable.
 */
export function formatCompactPenceGBP(pence: number): string {
  const pounds = pence / 100;
  if (pounds >= 1_000_000) {
    // 2sf after the point, then strip a trailing ".00"/".0" so £5m reads "£5M".
    return `£${(pounds / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  }
  if (pounds >= 1_000) return `£${Math.round(pounds / 1_000)}k`;
  return formatPenceGBP(pence);
}
