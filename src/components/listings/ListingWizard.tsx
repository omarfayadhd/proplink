"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { StepAddress } from "@/components/listings/StepAddress";
import { StepDetails } from "@/components/listings/StepDetails";
import { StepDistress } from "@/components/listings/StepDistress";
import { StepMedia } from "@/components/listings/StepMedia";
import { StepReview } from "@/components/listings/StepReview";
import {
  WIZARD_STEPS,
  buildListingPayload,
  canSaveDraft,
  type WizardFormState,
  type WizardStepId,
} from "@/components/listings/wizardTypes";
import { cn } from "@/lib/cn";

export interface AgentProfileOption {
  id: string;
  agencyName: string;
}

export interface ListingWizardProps {
  agentProfiles: AgentProfileOption[];
  initial: WizardFormState;
}

async function parseErrorMessage(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  if (data?.issues) {
    const first = Object.values(data.issues as Record<string, string[]>).flat()[0];
    if (first) return first;
  }
  return data?.error ?? `Request failed (${res.status})`;
}

export function ListingWizard({ agentProfiles, initial }: ListingWizardProps) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<WizardStepId>(1);
  const [state, setState] = useState<WizardFormState>(initial);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = useMemo(() => canSaveDraft(state), [state]);

  function patch(next: Partial<WizardFormState>) {
    setState((prev) => ({ ...prev, ...next }));
  }

  async function persist(): Promise<boolean> {
    setError(null);
    const payload = buildListingPayload(state);
    try {
      if (!state.id) {
        const res = await fetch("/api/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentProfileId: state.agentProfileId, ...payload }),
        });
        if (!res.ok) throw new Error(await parseErrorMessage(res));
        const created = await res.json();
        setState((prev) => ({ ...prev, id: created.id }));
      } else {
        const res = await fetch(`/api/listings/${state.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await parseErrorMessage(res));
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      return false;
    }
  }

  async function onSaveDraft() {
    setSaving(true);
    try {
      const ok = await persist();
      if (ok) toast("Draft saved", "success");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmitForReview() {
    setSubmitting(true);
    try {
      const saved = await persist();
      if (!saved) return;
      const id = state.id;
      if (!id) return; // persist() would have set an error already
      const res = await fetch(`/api/listings/${id}/submit`, { method: "POST" });
      if (!res.ok) {
        setError(await parseErrorMessage(res));
        return;
      }
      toast("Listing submitted for review", "success");
      router.push("/agent/listings");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {agentProfiles.length > 1 && !state.id && (
        <Select
          label="Listing under agency profile"
          options={agentProfiles.map((p) => ({ value: p.id, label: p.agencyName }))}
          value={state.agentProfileId}
          onChange={(e) => patch({ agentProfileId: e.target.value })}
          className="max-w-sm"
        />
      )}

      <ol className="flex flex-wrap gap-2 text-xs font-semibold">
        {WIZARD_STEPS.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => setStep(s.id)}
              className={cn(
                "rounded-full px-3 py-1.5 transition-colors",
                step === s.id
                  ? "bg-accent text-white"
                  : "border border-line bg-white text-secondary hover:border-accent",
              )}
            >
              {s.id}. {s.label}
            </button>
          </li>
        ))}
      </ol>

      <div className="rounded-lg border border-line bg-white p-6">
        {step === 1 && <StepAddress state={state} onChange={patch} />}
        {step === 2 && <StepDetails state={state} onChange={patch} />}
        {step === 3 && <StepDistress state={state} onChange={patch} />}
        {step === 4 && <StepMedia state={state} onChange={patch} />}
        {step === 5 && <StepReview state={state} />}
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={step === 1}
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as WizardStepId) : s))}
        >
          Back
        </Button>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right">
            <Button
              type="button"
              variant="outline"
              disabled={!canSave || saving}
              onClick={onSaveDraft}
            >
              {saving ? "Saving…" : "Save draft"}
            </Button>
            {!canSave && (
              <p className="mt-1 text-xs text-muted">
                Complete the address and details steps first
              </p>
            )}
          </div>

          {step < 5 ? (
            <Button
              type="button"
              onClick={() => setStep((s) => (s < 5 ? ((s + 1) as WizardStepId) : s))}
            >
              Next
            </Button>
          ) : (
            <Button type="button" disabled={submitting} onClick={onSubmitForReview}>
              {submitting ? "Submitting…" : "Submit for review"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
