"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * Save/unsave toggle for the public detail page (Task 2.6). Rendered only for
 * a logged-in BUYER/INVESTOR — the route re-checks the role server-side, so
 * hiding it is presentation, not the security boundary.
 *
 * Optimistic: the label flips immediately and reverts if the request fails.
 * Both verbs are idempotent server-side, so a double-click can't desynchronise
 * the row from the button.
 */
export function SaveButton({
  propertyId,
  initialSaved,
}: {
  propertyId: string;
  initialSaved: boolean;
}) {
  const toast = useToast();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next = !saved;
    setSaved(next);
    setPending(true);
    try {
      const res = await fetch(`/api/listings/${propertyId}/save`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) {
        setSaved(!next);
        toast("Could not update your saved listings", "danger");
        return;
      }
      toast(next ? "Saved to your list" : "Removed from your list", "success");
    } catch {
      setSaved(!next);
      toast("Could not update your saved listings", "danger");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant={saved ? "secondary" : "primary"}
      onClick={toggle}
      disabled={pending}
      data-testid="save-listing-button"
      aria-pressed={saved}
    >
      {saved ? "★ Saved" : "☆ Save"}
    </Button>
  );
}
