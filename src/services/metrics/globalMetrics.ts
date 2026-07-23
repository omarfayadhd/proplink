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
