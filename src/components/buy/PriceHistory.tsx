import { formatPenceGBP } from "@/services/metrics/globalMetrics";
import type { ComparableSummary } from "@/services/intel/comparables";

/**
 * Median sold price by year for a postcode district (Task 5.7).
 *
 * ⚠️ **The data is sample data, not Land Registry data**, until the ingest lands
 * (H5.4). The product owner asked for the chart built against seeded
 * comparables rather than omitted, and the honest way to do that is to say so
 * *on the chart* — not only in a doc. A price chart on a property site that
 * looks authoritative but is invented is worse than no chart, so the notice is
 * rendered before the figures and `isSample` gates it rather than a magic
 * constant someone can forget to flip.
 *
 * Inline SVG rather than a charting library: five to ten points on one axis does
 * not justify a dependency, and this way it inherits the palette tokens.
 */

export function PriceHistory({ data }: { data: ComparableSummary }) {
  const prices = data.points.map((p) => p.medianPriceGBP);
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  // A flat series would divide by zero; a single point has no range either.
  const span = max - min || max || 1;

  const width = 100;
  const height = 40;
  const x = (i: number) =>
    data.points.length === 1 ? width / 2 : (i / (data.points.length - 1)) * width;
  const y = (v: number) => height - ((v - min) / span) * (height - 6) - 3;

  const path = data.points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${x(i).toFixed(2)} ${y(p.medianPriceGBP).toFixed(2)}`,
    )
    .join(" ");

  return (
    <section aria-labelledby="price-history-heading">
      <h2 id="price-history-heading" className="text-lg font-bold text-primary">
        Price history
      </h2>

      {data.isSample ? (
        <p
          data-testid="comparables-sample-notice"
          className="mt-2 rounded-lg bg-warning/10 px-4 py-3 text-sm text-warning"
        >
          <strong>Sample data.</strong> These figures are illustrative and are not HM Land
          Registry records. Do not rely on them for a valuation — the real Price Paid feed
          is not connected yet.
        </p>
      ) : null}

      <p className="mt-3 text-sm text-muted">
        Median sold price in {data.postcodeDistrict}, by year.
      </p>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Median sold price in ${data.postcodeDistrict} from ${data.points[0]?.year} to ${data.points.at(-1)?.year}`}
        preserveAspectRatio="none"
        className="mt-4 h-40 w-full sm:h-48"
      >
        <path
          d={path}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Outside the SVG: it stretches to fill its box, which would distort any
          text inside it. */}
      <ol className="mt-2 flex justify-between text-xs text-muted">
        {data.points.map((p) => (
          <li key={p.year}>{p.year}</li>
        ))}
      </ol>

      <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-3 text-sm">
        <div>
          <dt className="text-muted">Latest median</dt>
          <dd className="font-semibold text-primary">
            {formatPenceGBP(data.points.at(-1)?.medianPriceGBP ?? 0)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Sales in sample</dt>
          <dd className="font-semibold text-primary">
            {data.points.reduce((n, p) => n + p.count, 0)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
