import "server-only";
import { db } from "@/lib/db";

/**
 * Land Registry comparable sales for a postcode district (sprint plan Task 5.7).
 *
 * ⚠️ **The seeded rows are invented, not Land Registry data.** The real ingest is
 * Sprint 5 and the table would otherwise be empty; the product owner asked for
 * the chart to be built against sample data rather than omitted. Every surface
 * that renders these must say so in the UI — a price chart on a property site
 * that looks authoritative but is fabricated is worse than no chart, so the
 * label is not optional and `isSample` exists to make it hard to forget.
 */

export interface ComparableSummary {
  postcodeDistrict: string;
  /** Ascending by year, so a chart can plot it directly. */
  points: { year: number; medianPriceGBP: number; count: number }[];
  /** Always true until the Land Registry ingest lands (H5.4). */
  isSample: boolean;
}

/** Median rather than mean: one outlier sale should not move the line. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export async function getComparables(
  postcodeDistrict: string,
): Promise<ComparableSummary | null> {
  const sales = await db.comparableSale.findMany({
    where: { postcodeDistrict },
    select: { soldDate: true, priceGBP: true },
  });

  if (sales.length === 0) return null;

  const byYear = new Map<number, number[]>();
  for (const s of sales) {
    const year = s.soldDate.getUTCFullYear();
    byYear.set(year, [...(byYear.get(year) ?? []), s.priceGBP]);
  }

  return {
    postcodeDistrict,
    points: [...byYear.entries()]
      .map(([year, prices]) => ({
        year,
        medianPriceGBP: median(prices),
        count: prices.length,
      }))
      .sort((a, b) => a.year - b.year),
    isSample: true,
  };
}
