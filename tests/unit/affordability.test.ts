import { describe, expect, it } from "vitest";
import { affordability, monthlyRepaymentGBP } from "@/lib/affordability";

/** £ helper — the module is integer pence throughout (AGENTS.md). */
const gbp = (pounds: number) => Math.round(pounds * 100);

describe("monthlyRepaymentGBP", () => {
  it("amortises a repayment mortgage", () => {
    // £200,000 over 25 years at 5%: the standard figure is ~£1,169.18/month.
    const m = monthlyRepaymentGBP(gbp(200_000), 5, 25);
    expect(m).toBeGreaterThan(gbp(1_169));
    expect(m).toBeLessThan(gbp(1_170));
  });

  it("is the straight division when the rate is zero", () => {
    // No interest: 120,000 over 10 years is exactly 1,000 a month.
    expect(monthlyRepaymentGBP(gbp(120_000), 0, 10)).toBe(gbp(1_000));
  });

  it("is zero when nothing is borrowed", () => {
    expect(monthlyRepaymentGBP(0, 5, 25)).toBe(0);
  });

  it("costs more per month over a shorter term", () => {
    const short = monthlyRepaymentGBP(gbp(200_000), 5, 15);
    const long = monthlyRepaymentGBP(gbp(200_000), 5, 30);
    expect(short).toBeGreaterThan(long);
  });

  it("returns whole pence, never a fraction of one", () => {
    expect(Number.isInteger(monthlyRepaymentGBP(gbp(123_456), 4.37, 23))).toBe(true);
  });
});

describe("affordability", () => {
  const base = {
    depositGBP: gbp(50_000),
    annualIncomeGBP: gbp(60_000),
    incomeMultiple: 4.5,
    annualRatePct: 5,
    termYears: 25,
  };

  it("borrows income times the multiple, and adds the deposit for the budget", () => {
    const result = affordability(base);

    expect(result.maxBorrowGBP).toBe(gbp(270_000));
    expect(result.maxBudgetGBP).toBe(gbp(320_000));
  });

  it("reports the monthly cost of borrowing the maximum", () => {
    const result = affordability(base);
    expect(result.monthlyRepaymentGBP).toBe(monthlyRepaymentGBP(gbp(270_000), 5, 25));
  });

  it("says a listing is within budget when it is", () => {
    expect(affordability({ ...base, askingPriceGBP: gbp(300_000) }).withinBudget).toBe(
      true,
    );
  });

  it("says a listing is out of budget when it is, and by how much", () => {
    const result = affordability({ ...base, askingPriceGBP: gbp(350_000) });

    expect(result.withinBudget).toBe(false);
    expect(result.shortfallGBP).toBe(gbp(30_000));
  });

  it("treats a listing priced exactly at the budget as affordable", () => {
    // The boundary decides whether a buyer sees a listing at all, so it is
    // asserted rather than left to chance.
    const result = affordability({ ...base, askingPriceGBP: gbp(320_000) });

    expect(result.withinBudget).toBe(true);
    expect(result.shortfallGBP).toBe(0);
  });

  it("has no verdict at all when no asking price is being checked", () => {
    const result = affordability(base);

    expect(result.withinBudget).toBeNull();
    expect(result.shortfallGBP).toBe(0);
  });

  it("never returns a negative budget for a nonsense income", () => {
    const result = affordability({ ...base, annualIncomeGBP: -1, depositGBP: 0 });

    expect(result.maxBorrowGBP).toBe(0);
    expect(result.maxBudgetGBP).toBe(0);
  });

  it("a deposit alone still buys something", () => {
    // Cash buyers exist, and a zero income must not zero the budget.
    const result = affordability({ ...base, annualIncomeGBP: 0 });

    expect(result.maxBorrowGBP).toBe(0);
    expect(result.maxBudgetGBP).toBe(gbp(50_000));
    expect(result.monthlyRepaymentGBP).toBe(0);
  });
});
