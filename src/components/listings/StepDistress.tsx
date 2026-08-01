"use client";

import { MultiSelect } from "@/components/ui/multi-select";
import {
  DISTRESS_TAG_OPTIONS,
  type WizardFormState,
} from "@/components/listings/wizardTypes";
import type { DistressTag } from "@/generated/prisma/enums";

export function StepDistress({
  state,
  onChange,
}: {
  state: WizardFormState;
  onChange: (patch: Partial<WizardFormState>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-primary">Distress tags</h2>
        <p className="mt-1 text-sm text-muted">
          Select every factor that applies — buyers and investors filter and price on
          these.
        </p>
        <MultiSelect
          className="mt-3"
          options={DISTRESS_TAG_OPTIONS}
          value={state.distressTags}
          onChange={(next) => onChange({ distressTags: next as DistressTag[] })}
        />
      </div>

      <div className="rounded-lg border border-line bg-surface p-4">
        <label className="flex items-start gap-3 text-sm text-body">
          <input
            id="pricingSafeguardAck"
            type="checkbox"
            checked={state.pricingSafeguardAck}
            onChange={(e) => onChange({ pricingSafeguardAck: e.target.checked })}
            className="mt-0.5"
          />
          <span>
            I confirm the seller has been advised that this asking price is provisional
            and may be revised following the findings of a structural or condition survey,
            and that any change to the price will be disclosed to prospective buyers and
            investors before offers are accepted. Only the information provided here, and
            no more than necessary, will be shown publicly on the listing.
          </span>
        </label>
      </div>
    </div>
  );
}
