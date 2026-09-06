import { formatPenceGBP, getGlobalMetrics } from "@/services/metrics/globalMetrics";

/**
 * The sprint plan's four-metric global strip (Task 1.5).
 *
 * No longer mounted in the root layout: as of ADR-005 the marketing landing
 * page carries these figures in its hero (`<HeroStats>`), which omits the
 * zero-valued ones. Kept for the signed-in portal shells, where a persistent
 * strip earns its space and every metric eventually has a value.
 */
export async function MetricsStrip() {
  const m = await getGlobalMetrics();

  const items = [
    {
      label: "Total Distress Inventory",
      value: formatPenceGBP(m.totalDistressInventoryGBP),
    },
    { label: "Completed Syndicate Deals", value: String(m.completedSyndicateDeals) },
    { label: "Accrued Success Fees", value: formatPenceGBP(m.accruedSuccessFeesGBP) },
    { label: "Vetted Referrals Routed", value: String(m.vettedReferralsRouted) },
  ];

  return (
    <div className="border-b border-line bg-primary text-white">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-2 px-6 py-3 text-center sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label}>
            <div data-testid="metric-value" className="text-lg font-semibold">
              {item.value}
            </div>
            <div className="text-xs text-pale/80">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
