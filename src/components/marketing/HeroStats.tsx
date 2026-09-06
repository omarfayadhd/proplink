import {
  formatCompactPenceGBP,
  formatPenceGBP,
  getGlobalMetrics,
  getLandingStats,
} from "@/services/metrics/globalMetrics";

interface Stat {
  value: string;
  label: string;
  /** Un-abbreviated value, surfaced on hover for the compacted £ figures. */
  title?: string;
}

/**
 * The landing page's headline figures — the successor to the full-width
 * `MetricsStrip` that used to sit above the site header (ADR-005).
 *
 * Zero-valued metrics are omitted deliberately: pre-launch, three of the
 * sprint plan's four global metrics are structurally 0 (no syndicate has
 * completed, so no success fee has accrued), and a hero advertising "0
 * completed deals · £0 fees" actively damages the credibility the strip
 * exists to build. They reappear on their own the moment they have a value,
 * so nothing needs changing at launch.
 */
export async function HeroStats() {
  const [metrics, landing] = await Promise.all([getGlobalMetrics(), getLandingStats()]);

  const stats: Stat[] = [];

  if (metrics.totalDistressInventoryGBP > 0) {
    stats.push({
      value: formatCompactPenceGBP(metrics.totalDistressInventoryGBP),
      label: "Total Distress Inventory",
      title: formatPenceGBP(metrics.totalDistressInventoryGBP),
    });
  }
  if (landing.liveListings > 0) {
    stats.push({
      value: String(landing.liveListings),
      label: landing.liveListings === 1 ? "Live listing" : "Live listings",
    });
  }
  if (landing.avgTargetRoiPct != null) {
    stats.push({ value: `${landing.avgTargetRoiPct}%`, label: "Avg target ROI" });
  }
  if (metrics.completedSyndicateDeals > 0) {
    stats.push({
      value: String(metrics.completedSyndicateDeals),
      label: "Completed Syndicate Deals",
    });
  }
  if (metrics.accruedSuccessFeesGBP > 0) {
    stats.push({
      value: formatCompactPenceGBP(metrics.accruedSuccessFeesGBP),
      label: "Accrued Success Fees",
      title: formatPenceGBP(metrics.accruedSuccessFeesGBP),
    });
  }
  if (metrics.vettedReferralsRouted > 0) {
    stats.push({
      value: String(metrics.vettedReferralsRouted),
      label: "Vetted Referrals Routed",
    });
  }

  // An empty database would otherwise render an empty bordered box.
  if (stats.length === 0) return null;

  return (
    // Editorial stat row: oversized italic display figures over hairline-topped
    // columns, left-aligned to the statement above them.
    <dl
      data-testid="hero-stats"
      className="mt-14 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4"
    >
      {stats.map((stat) => (
        // `flex-col-reverse` renders the figure above its caption while keeping
        // the `dt`-before-`dd` order the spec (and screen readers) expect.
        <div
          key={stat.label}
          className="flex flex-col-reverse items-start border-t border-line pt-4"
        >
          <dt className="mt-2 text-[11px] tracking-[0.14em] text-muted uppercase">
            {stat.label}
          </dt>
          <dd
            data-testid="metric-value"
            title={stat.title}
            className="font-display text-4xl font-semibold tracking-tight text-primary sm:text-5xl"
          >
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
