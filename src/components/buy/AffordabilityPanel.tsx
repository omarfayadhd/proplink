"use client";

import { useMemo, useState } from "react";
import { affordability } from "@/lib/affordability";

/**
 * The buyer's affordability calculator (Task 5.7), as a panel inside the Price
 * filter rather than a wall in front of the results (ADR-020).
 *
 * It used to open the buyer portal, which meant every visitor answered five
 * finance questions before seeing a single property. Consumer property search
 * does not work that way: you look first, and you work out what you can afford
 * when the prices start mattering. So the maths is unchanged and the placement
 * is not — it now sits one click inside `Price ▾`, and `onApply` writes its
 * answer straight into the search as `maxPrice`.
 *
 * Client-side and instant: the maths is pure (`@/lib/affordability`, unit
 * tested), so there is nothing to submit and no round trip.
 *
 * **It is a guide, not a decision.** Lenders stress-test affordability, credit
 * score, and apply their own multiples. Saying so is not a disclaimer for its
 * own sake: a buyer who treats this as a mortgage offer will waste an agent's
 * time and their own.
 */

/** Pounds in the inputs, pence in the maths — the boundary is here. */
const toPence = (pounds: number) => Math.round(pounds * 100);

const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const FIELD =
  "mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none";

function Field({
  label,
  suffix,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  suffix?: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
        {label}
        {suffix ? <span className="font-normal normal-case"> ({suffix})</span> : null}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.currentTarget.valueAsNumber)}
        className={FIELD}
      />
    </label>
  );
}

export function AffordabilityPanel({
  onApply,
}: {
  /** Receives the computed budget in **whole pounds** — the unit the slider uses. */
  onApply: (budgetPounds: number) => void;
}) {
  const [deposit, setDeposit] = useState(50_000);
  const [income, setIncome] = useState(60_000);
  const [multiple, setMultiple] = useState(4.5);
  const [rate, setRate] = useState(5);
  const [term, setTerm] = useState(25);

  const result = useMemo(
    () =>
      affordability({
        depositGBP: toPence(deposit),
        annualIncomeGBP: toPence(income),
        incomeMultiple: multiple,
        annualRatePct: rate,
        termYears: term,
      }),
    [deposit, income, multiple, rate, term],
  );

  const budgetPounds = Math.floor(result.maxBudgetGBP / 100);

  return (
    <div data-testid="affordability" className="space-y-4">
      <p className="text-xs text-muted">
        A guide, not a mortgage decision — lenders apply their own affordability checks.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Deposit"
          suffix="£"
          value={deposit}
          onChange={setDeposit}
          step={1000}
        />
        <Field
          label="Income"
          suffix="£"
          value={income}
          onChange={setIncome}
          step={1000}
        />
        <Field label="Multiple" value={multiple} onChange={setMultiple} step={0.1} />
        <Field label="Rate" suffix="%" value={rate} onChange={setRate} step={0.1} />
        <Field label="Term" suffix="years" value={term} onChange={setTerm} />
      </div>

      <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4">
        <div>
          <dd
            data-testid="max-budget"
            className="text-2xl font-semibold tracking-tight text-primary"
          >
            {GBP.format(result.maxBudgetGBP / 100)}
          </dd>
          <dt className="mt-1 text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
            Max budget
          </dt>
        </div>
        <div>
          <dd className="text-2xl font-semibold tracking-tight text-primary">
            {GBP.format(result.monthlyRepaymentGBP / 100)}
          </dd>
          <dt className="mt-1 text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
            Per month
          </dt>
        </div>
      </dl>

      {/* The panel's whole reason for sitting inside the price filter. */}
      <button
        type="button"
        onClick={() => onApply(budgetPounds)}
        className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Use {GBP.format(budgetPounds)} as my budget
      </button>

      <a
        href="https://www.moneyhelper.org.uk/en/homes/buying-a-home/mortgage-agreement-in-principle"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-xs font-semibold text-primary underline decoration-line underline-offset-4 hover:decoration-accent"
      >
        About decisions in principle
      </a>
    </div>
  );
}
