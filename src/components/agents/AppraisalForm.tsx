"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

const RATING_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({
  value: String(n),
  label: `${n} / 5`,
}));

async function parseErrorMessage(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  if (data?.issues) {
    const first = Object.values(data.issues as Record<string, string[]>).flat()[0];
    if (first) return first;
  }
  return data?.error ?? `Request failed (${res.status})`;
}

/**
 * Public `/agents/[id]` review form — only ever rendered by the page for a
 * user the server has already confirmed is eligible
 * (`getAppraisalEligibility`). The POST is re-checked server-side regardless
 * (AGENTS.md: never trust the client) — this form has no special access, it
 * just isn't shown to callers the server already knows will be rejected.
 */
export function AppraisalForm({ agentProfileId }: { agentProfileId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [rating, setRating] = useState("5");
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = review.trim().length >= 10;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentProfileId}/appraisals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: Number(rating), review: review.trim() }),
      });
      if (!res.ok) {
        setError(await parseErrorMessage(res));
        return;
      }
      toast("Appraisal posted", "success");
      setReview("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-md space-y-3 rounded-lg border border-line bg-white p-4"
    >
      <Select
        id="appraisal-rating"
        label="Rating"
        options={RATING_OPTIONS}
        value={rating}
        onChange={(e) => setRating(e.target.value)}
      />
      <div>
        <label htmlFor="appraisal-review" className="block text-sm font-medium text-body">
          Review
        </label>
        <textarea
          id="appraisal-review"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows={4}
          placeholder="Share how this agency handled your enquiry or deal…"
          className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!canSubmit || submitting}>
        {submitting ? "Posting…" : "Post appraisal"}
      </Button>
    </form>
  );
}
