/**
 * Buyer affordability maths (ADR-017, sprint plan Task 5.7).
 *
 * Pure and DOM-free so the numbers a buyer makes a decision on are unit-tested
 * rather than eyeballed. **Every `*GBP` value is integer pence**
 * (AGENTS.md § non-negotiables) — nothing here is a float pound, and the only
 * rounding is the final conversion back to whole pence.
 *
 * This is a guide, not a mortgage decision. Lenders apply affordability
 * stress-testing, credit scoring and their own multiples; the UI says so, and
 * the "decision in principle" link is the route to a real answer.
 */

export interface AffordabilityInput {
  depositGBP: number;
  annualIncomeGBP: number;
  /** Lender's income multiple, e.g. 4.5. */
  incomeMultiple: number;
  /** Annual interest rate as a percentage, e.g. 5 for 5%. */
  annualRatePct: number;
  termYears: number;
  /** When present, the listing being checked against the budget. */
  askingPriceGBP?: number;
}

export interface AffordabilityResult {
  maxBorrowGBP: number;
  maxBudgetGBP: number;
  /** Monthly cost of borrowing `maxBorrowGBP` over the term. */
  monthlyRepaymentGBP: number;
  /** `null` when no asking price was supplied — no verdict, not a failing one. */
  withinBudget: boolean | null;
  /** How far over budget the asking price is; 0 when within it or unchecked. */
  shortfallGBP: number;
}

const atLeastZero = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Monthly payment on a repayment mortgage.
 *
 * `M = P · r(1+r)^n / ((1+r)^n − 1)`, with `r` the monthly rate and `n` the
 * number of payments. At a zero rate that formula divides by zero, so the
 * interest-free case is handled separately rather than nudged.
 */
export function monthlyRepaymentGBP(
  principalGBP: number,
  annualRatePct: number,
  termYears: number,
): number {
  const principal = atLeastZero(principalGBP);
  const months = atLeastZero(termYears) * 12;
  if (principal === 0 || months === 0) return 0;

  const monthlyRate = atLeastZero(annualRatePct) / 100 / 12;
  if (monthlyRate === 0) return Math.round(principal / months);

  const growth = (1 + monthlyRate) ** months;
  return Math.round((principal * (monthlyRate * growth)) / (growth - 1));
}

/**
 * What a buyer can spend, and whether a given listing fits inside it.
 *
 * `maxBorrow` is income × the lender's multiple; the budget is that plus the
 * deposit. A zero income still yields a budget — cash buyers exist, and zeroing
 * the whole thing would hide every listing they could actually afford.
 */
export function affordability(input: AffordabilityInput): AffordabilityResult {
  const deposit = atLeastZero(input.depositGBP);
  const income = atLeastZero(input.annualIncomeGBP);
  const multiple = atLeastZero(input.incomeMultiple);

  const maxBorrowGBP = Math.round(income * multiple);
  const maxBudgetGBP = maxBorrowGBP + deposit;

  const asking = input.askingPriceGBP;
  const checking = typeof asking === "number" && Number.isFinite(asking);

  return {
    maxBorrowGBP,
    maxBudgetGBP,
    monthlyRepaymentGBP: monthlyRepaymentGBP(
      maxBorrowGBP,
      input.annualRatePct,
      input.termYears,
    ),
    // A listing priced exactly at the budget is affordable — the boundary
    // decides whether a buyer sees it at all.
    withinBudget: checking ? asking <= maxBudgetGBP : null,
    shortfallGBP: checking ? Math.max(0, asking - maxBudgetGBP) : 0,
  };
}
