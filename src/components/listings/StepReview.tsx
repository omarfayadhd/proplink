"use client";

import { Badge } from "@/components/ui/badge";
import {
  DISTRESS_TAG_OPTIONS,
  formatPenceGBP,
  missingForSubmission,
  poundsToPence,
  type WizardFormState,
} from "@/components/listings/wizardTypes";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-body">{value || "—"}</dd>
    </div>
  );
}

export function StepReview({ state }: { state: WizardFormState }) {
  const missing = missingForSubmission(state);
  const tagLabels = state.distressTags.map(
    (tag) => DISTRESS_TAG_OPTIONS.find((o) => o.value === tag)?.label ?? tag,
  );

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-primary">Review</h2>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Title" value={state.title} />
        <Field
          label="Address"
          value={`${state.addressLine1}, ${state.city}, ${state.region}, ${state.postcode}`}
        />
        <Field label="Property type" value={state.propertyType} />
        <Field label="Bedrooms" value={state.bedrooms} />
        <Field
          label="Asking price"
          value={formatPenceGBP(poundsToPence(state.askingPricePounds))}
        />
        <Field
          label="Target ROI"
          value={state.targetRoiPct ? `${state.targetRoiPct}%` : ""}
        />
        <Field label="EPC rating" value={state.epcRating} />
        <Field label="Photos" value={`${state.images.length} uploaded`} />
      </dl>

      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-muted">
          Distress tags
        </dt>
        <dd className="mt-1 flex flex-wrap gap-2">
          {tagLabels.length > 0 ? (
            tagLabels.map((label) => (
              <Badge key={label} tone="warning">
                {label}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-body">—</span>
          )}
        </dd>
      </div>

      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-muted">
          Description
        </dt>
        <dd className="mt-1 whitespace-pre-wrap text-sm text-body">
          {state.description || "—"}
        </dd>
      </div>

      {missing.length > 0 ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
          <p className="font-semibold">Before you can submit for review, add:</p>
          <ul className="mt-1 list-inside list-disc">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-lg border border-success/40 bg-success/10 p-4 text-sm font-semibold text-success">
          Ready to submit for review.
        </div>
      )}
    </div>
  );
}
