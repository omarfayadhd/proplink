import { describe, expect, it } from "vitest";
import { equityPct, summarisePortfolio } from "@/services/syndicates/portfolio";

/** A pledge as `investorDashboard` shapes it, trimmed to what the maths needs. */
const pledge = (
  amountGBP: number,
  capitalTargetGBP: number,
  status = "PLEDGED",
  projectId = "p1",
) => ({ amountGBP, status, projectId, project: { capitalTargetGBP } });

describe("equityPct", () => {
  it("is the pledge's share of the project's capital target", () => {
    // £25,000 of a £100,000 target.
    expect(equityPct(2_500_000, 10_000_000)).toBe(25);
  });

  it("rounds to one decimal, because equity is quoted not computed", () => {
    expect(equityPct(1_000_000, 3_000_000)).toBe(33.3);
  });

  it("is 0 for a project with no capital target rather than dividing by zero", () => {
    expect(equityPct(2_500_000, 0)).toBe(0);
  });

  it("never exceeds 100, even if a pledge somehow overshoots the target", () => {
    // Over-pledging is a data error, not an equity holding of 150%.
    expect(equityPct(15_000_000, 10_000_000)).toBe(100);
  });
});

describe("summarisePortfolio", () => {
  it("totals only pledges that still stand", () => {
    // WITHDRAWN money is not committed capital and must not inflate the total.
    const rows = [
      pledge(2_500_000, 10_000_000),
      pledge(1_000_000, 10_000_000),
      pledge(9_900_000, 10_000_000, "WITHDRAWN"),
    ];

    expect(summarisePortfolio(rows).committedGBP).toBe(3_500_000);
  });

  it("counts projects distinctly — two pledges into one project is one project", () => {
    // An investor can top up the same syndicate more than once; the portfolio
    // holds one project, not two.
    const rows = [
      pledge(1_000_000, 5_000_000, "PLEDGED", "p1"),
      pledge(2_000_000, 5_000_000, "PLEDGED", "p1"),
      pledge(3_000_000, 8_000_000, "PLEDGED", "p2"),
    ];
    const summary = summarisePortfolio(rows);

    expect(summary.projectCount).toBe(2);
    expect(summary.pledgeCount).toBe(3);
  });

  it("reports zeros for an investor who has pledged nothing", () => {
    // A brand-new investor lands on this dashboard, so the empty case is the
    // common one rather than an edge case.
    expect(summarisePortfolio([])).toStrictEqual({
      committedGBP: 0,
      pledgeCount: 0,
      projectCount: 0,
    });
  });

  it("excludes withdrawn pledges from the project count too", () => {
    const rows = [pledge(1_000_000, 5_000_000, "WITHDRAWN")];
    expect(summarisePortfolio(rows).projectCount).toBe(0);
  });

  it("still counts a project whose other pledge was withdrawn", () => {
    const rows = [
      pledge(1_000_000, 5_000_000, "WITHDRAWN", "p1"),
      pledge(2_000_000, 5_000_000, "PLEDGED", "p1"),
    ];
    const summary = summarisePortfolio(rows);

    expect(summary.projectCount).toBe(1);
    expect(summary.committedGBP).toBe(2_000_000);
  });
});
