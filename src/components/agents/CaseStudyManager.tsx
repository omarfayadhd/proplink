"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  formatPenceGBP,
  penceToPoundsInput,
  poundsToPence,
} from "@/components/listings/wizardTypes";

export interface CaseStudyDTO {
  id: string;
  title: string;
  capexGBP: number;
  netMarginGBP: number;
  description: string;
  imageUrl: string | null;
}

interface FormState {
  title: string;
  capexPounds: string;
  netMarginPounds: string;
  description: string;
  imageUrl: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  capexPounds: "",
  netMarginPounds: "",
  description: "",
  imageUrl: "",
};

function toForm(cs: CaseStudyDTO): FormState {
  return {
    title: cs.title,
    capexPounds: penceToPoundsInput(cs.capexGBP),
    netMarginPounds: penceToPoundsInput(cs.netMarginGBP),
    description: cs.description,
    imageUrl: cs.imageUrl ?? "",
  };
}

function buildPayload(form: FormState) {
  return {
    title: form.title,
    // Money integer pence (AGENTS.md): the form collects pounds, converted
    // at this fetch-call boundary — same pattern as the listing wizard's
    // `buildListingPayload` in `wizardTypes.ts`.
    capexGBP: poundsToPence(form.capexPounds),
    netMarginGBP: poundsToPence(form.netMarginPounds),
    description: form.description,
    imageUrl: form.imageUrl.trim() === "" ? null : form.imageUrl.trim(),
  };
}

async function parseErrorMessage(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  if (data?.issues) {
    const first = Object.values(data.issues as Record<string, string[]>).flat()[0];
    if (first) return first;
  }
  return data?.error ?? `Request failed (${res.status})`;
}

/**
 * `/agent/profile` case-study CRUD (Task 2.4). One instance per owned
 * `AgentProfile` (see `/agent/profile/page.tsx`) — create, inline edit and
 * delete all go through `/api/case-studies[/:id]`, which enforce ownership
 * server-side; this component trusts nothing beyond re-rendering what those
 * routes return.
 */
export function CaseStudyManager({
  agentProfileId,
  caseStudies,
}: {
  agentProfileId: string;
  caseStudies: CaseStudyDTO[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/case-studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentProfileId, ...buildPayload(addForm) }),
      });
      if (!res.ok) {
        setError(await parseErrorMessage(res));
        return;
      }
      toast("Case study added", "success");
      setAddForm(EMPTY_FORM);
      setAdding(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/case-studies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(editForm)),
      });
      if (!res.ok) {
        setError(await parseErrorMessage(res));
        return;
      }
      toast("Case study updated", "success");
      setEditingId(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this case study?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/case-studies/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError(await parseErrorMessage(res));
        return;
      }
      toast("Case study deleted", "success");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {caseStudies.length === 0 && !adding && (
        <p className="text-sm text-muted">No case studies yet.</p>
      )}

      <ul className="space-y-3">
        {caseStudies.map((cs) => (
          <li key={cs.id} className="rounded-lg border border-line bg-pale/40 p-4">
            {editingId === cs.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSaveEdit(cs.id);
                }}
                className="space-y-3"
              >
                <Input
                  id={`title-${cs.id}`}
                  label="Title"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id={`capex-${cs.id}`}
                    label="Capex (£)"
                    value={editForm.capexPounds}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, capexPounds: e.target.value }))
                    }
                  />
                  <Input
                    id={`margin-${cs.id}`}
                    label="Net margin (£)"
                    value={editForm.netMarginPounds}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, netMarginPounds: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor={`description-${cs.id}`}
                    className="block text-sm font-medium text-body"
                  >
                    Description
                  </label>
                  <textarea
                    id={`description-${cs.id}`}
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, description: e.target.value }))
                    }
                    rows={3}
                    className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                </div>
                <Input
                  id={`image-${cs.id}`}
                  label="Image URL (optional)"
                  value={editForm.imageUrl}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, imageUrl: e.target.value }))
                  }
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={busy}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-semibold text-primary">{cs.title}</h4>
                  <div className="flex gap-3 text-xs font-medium">
                    <button
                      type="button"
                      className="text-accent underline"
                      onClick={() => {
                        setEditingId(cs.id);
                        setEditForm(toForm(cs));
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-danger underline"
                      disabled={busy}
                      onClick={() => onDelete(cs.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-muted">Capex</dt>
                    <dd className="font-medium text-body">
                      {formatPenceGBP(cs.capexGBP)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Net margin</dt>
                    <dd className="font-medium text-body">
                      {formatPenceGBP(cs.netMarginGBP)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-2 text-sm text-body">{cs.description}</p>
              </>
            )}
          </li>
        ))}
      </ul>

      {adding ? (
        <form
          onSubmit={onAdd}
          className="space-y-3 rounded-lg border border-line bg-white p-4"
        >
          <Input
            id={`add-title-${agentProfileId}`}
            label="Title"
            value={addForm.title}
            onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id={`add-capex-${agentProfileId}`}
              label="Capex (£)"
              value={addForm.capexPounds}
              onChange={(e) => setAddForm((f) => ({ ...f, capexPounds: e.target.value }))}
            />
            <Input
              id={`add-margin-${agentProfileId}`}
              label="Net margin (£)"
              value={addForm.netMarginPounds}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, netMarginPounds: e.target.value }))
              }
            />
          </div>
          <div>
            <label
              htmlFor={`add-description-${agentProfileId}`}
              className="block text-sm font-medium text-body"
            >
              Description
            </label>
            <textarea
              id={`add-description-${agentProfileId}`}
              value={addForm.description}
              onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <Input
            id={`add-image-${agentProfileId}`}
            label="Image URL (optional)"
            value={addForm.imageUrl}
            onChange={(e) => setAddForm((f) => ({ ...f, imageUrl: e.target.value }))}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              Add case study
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAdding(false);
                setAddForm(EMPTY_FORM);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="outline" onClick={() => setAdding(true)}>
          Add case study
        </Button>
      )}
    </div>
  );
}
