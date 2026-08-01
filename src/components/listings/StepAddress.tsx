"use client";

import { Input } from "@/components/ui/input";
import type { WizardFormState } from "@/components/listings/wizardTypes";

export function StepAddress({
  state,
  onChange,
}: {
  state: WizardFormState;
  onChange: (patch: Partial<WizardFormState>) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-primary">Address &amp; location</h2>
      <p className="text-sm text-muted">
        We&apos;ll geocode this postcode automatically so the listing appears correctly on
        the map.
      </p>
      <Input
        id="addressLine1"
        label="Address line 1"
        value={state.addressLine1}
        onChange={(e) => onChange({ addressLine1: e.target.value })}
        placeholder="12 Example Road"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="city"
          label="City / town"
          value={state.city}
          onChange={(e) => onChange({ city: e.target.value })}
        />
        <Input
          id="region"
          label="Region / county"
          value={state.region}
          onChange={(e) => onChange({ region: e.target.value })}
        />
      </div>
      <Input
        id="postcode"
        label="Postcode"
        value={state.postcode}
        onChange={(e) => onChange({ postcode: e.target.value.toUpperCase() })}
        placeholder="M1 1AE"
        className="max-w-xs"
      />
    </div>
  );
}
