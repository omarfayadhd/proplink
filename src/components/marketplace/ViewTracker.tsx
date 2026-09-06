"use client";

import { useEffect, useRef } from "react";

/**
 * Fires the Task 2.6 view beacon once per mount.
 *
 * The dedupe that matters ("once per session") is server-side, in the
 * session-cookie list `POST /api/listings/[id]/view` maintains — this is only
 * responsible for not double-firing within a single render. React 19 Strict
 * Mode runs effects twice in development, and a re-render must not re-ping, so
 * a ref guard rather than an empty dep array alone.
 *
 * Renders nothing. Failures are swallowed: an analytics counter is never worth
 * surfacing an error to a visitor over.
 */
export function ViewTracker({ propertyId }: { propertyId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    fetch(`/api/listings/${propertyId}/view`, { method: "POST" }).catch(() => {});
  }, [propertyId]);

  return null;
}
