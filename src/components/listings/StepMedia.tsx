"use client";

import { ImageUploader } from "@/components/uploads/ImageUploader";
import { SingleFileUploader } from "@/components/uploads/SingleFileUploader";
import { Select } from "@/components/ui/select";
import {
  EPC_RATING_OPTIONS,
  type WizardFormState,
} from "@/components/listings/wizardTypes";

export function StepMedia({
  state,
  onChange,
}: {
  state: WizardFormState;
  onChange: (patch: Partial<WizardFormState>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-primary">Photos</h2>
        <p className="mt-1 text-sm text-muted">
          The first photo is used as the cover image — drag to reorder.
        </p>
        <ImageUploader
          className="mt-3"
          max={20}
          value={state.images}
          onChange={(next) => onChange({ images: next })}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <Select
            id="epcRating"
            label="EPC rating"
            options={EPC_RATING_OPTIONS}
            placeholder="Select a rating"
            value={state.epcRating}
            onChange={(e) =>
              onChange({ epcRating: e.target.value as WizardFormState["epcRating"] })
            }
          />
          <p className="mt-1 text-xs text-muted">
            UK law requires every listing to display an EPC rating.
          </p>
          <SingleFileUploader
            className="mt-3"
            kinds={["pdf", "image"]}
            label="EPC certificate (PDF or image)"
            value={state.epcCertUrl}
            onChange={(url) => onChange({ epcCertUrl: url })}
          />
        </div>

        <div>
          <SingleFileUploader
            kinds={["pdf", "image"]}
            label="Floor plan (PDF or image)"
            value={state.floorPlanUrl}
            onChange={(url) => onChange({ floorPlanUrl: url })}
          />
        </div>
      </div>
    </div>
  );
}
