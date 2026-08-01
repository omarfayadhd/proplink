"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  PROPERTY_TYPE_OPTIONS,
  type WizardFormState,
} from "@/components/listings/wizardTypes";

export function StepDetails({
  state,
  onChange,
}: {
  state: WizardFormState;
  onChange: (patch: Partial<WizardFormState>) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-primary">Details</h2>

      <Input
        id="title"
        label="Listing title"
        value={state.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Three-bed semi needing full refurbishment"
      />

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-body">
          Description
        </label>
        <textarea
          id="description"
          rows={5}
          value={state.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm focus:border-accent focus:outline-none"
          placeholder="Describe the property's condition, distress factors and opportunity."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Select
          id="propertyType"
          label="Property type"
          options={PROPERTY_TYPE_OPTIONS}
          placeholder="Select a type"
          value={state.propertyType}
          onChange={(e) =>
            onChange({ propertyType: e.target.value as WizardFormState["propertyType"] })
          }
        />
        <Input
          id="bedrooms"
          label="Bedrooms"
          type="number"
          min={0}
          max={50}
          value={state.bedrooms}
          onChange={(e) =>
            onChange({ bedrooms: Math.max(0, Number(e.target.value) || 0) })
          }
        />
        <Input
          id="targetRoiPct"
          label="Target ROI %"
          type="number"
          min={0}
          max={1000}
          step="0.1"
          value={state.targetRoiPct}
          onChange={(e) => onChange({ targetRoiPct: e.target.value })}
          placeholder="Optional"
        />
      </div>

      <Input
        id="askingPricePounds"
        label="Asking price (£)"
        type="number"
        min={0}
        step="1"
        value={state.askingPricePounds}
        onChange={(e) => onChange({ askingPricePounds: e.target.value })}
        placeholder="150000"
        className="max-w-xs"
      />
    </div>
  );
}
