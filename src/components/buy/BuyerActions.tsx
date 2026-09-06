"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The buyer's write actions on a listing (ADR-017, Task 5.7): request a viewing,
 * make an offer, message the agent.
 *
 * Rendered only for a signed-in BUYER on a publicly visible listing — the server
 * decides that, not this component. Each action posts to its own route, which
 * re-authorises server-side; a client that renders a button is never what makes
 * an action allowed.
 *
 * These are the only entry points into `/buy`'s viewings, offers and messages
 * lists. Without them those lists could never fill.
 */

const TAB =
  "border-b-2 pb-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const INPUT =
  "mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none";
const LABEL = "text-[11px] font-semibold tracking-[0.12em] text-muted uppercase";
const SUBMIT =
  "rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

type Action = "viewing" | "offer" | "message";

/** The soonest slot a buyer can pick: tomorrow, so agents get notice. */
function tomorrowLocal(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  // `datetime-local` wants a local ISO string without the zone.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

export function BuyerActions({
  propertyId,
  askingPriceGBP,
}: {
  propertyId: string;
  /** Pence — seeds the offer field so the buyer edits a number, not a blank. */
  askingPriceGBP: number;
}) {
  const router = useRouter();
  const [action, setAction] = useState<Action>("viewing");
  const [slot, setSlot] = useState(tomorrowLocal());
  const [offerPounds, setOfferPounds] = useState(Math.round(askingPriceGBP / 100));
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function post(url: string, payload: unknown, success: string) {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong. Try again.");
        return;
      }
      setDone(success);
      setBody("");
      // The portal lists are server-rendered, so they need a refresh to show it.
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      data-testid="buyer-actions"
      aria-labelledby="buyer-actions-heading"
      className="rounded-2xl border border-line bg-surface p-6"
    >
      <h2 id="buyer-actions-heading" className="text-lg font-semibold text-primary">
        Take it further
      </h2>

      <div role="tablist" className="mt-4 flex gap-6 border-b border-line">
        {(
          [
            ["viewing", "Book a viewing"],
            ["offer", "Make an offer"],
            ["message", "Message agent"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={action === key}
            onClick={() => {
              setAction(key);
              setError(null);
              setDone(null);
            }}
            className={`${TAB} ${
              action === key
                ? "border-accent text-primary"
                : "border-transparent text-muted hover:text-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {action === "viewing" && (
          <div className="flex flex-wrap items-end gap-4">
            <label className="block">
              <span className={LABEL}>Preferred slot</span>
              <input
                type="datetime-local"
                aria-label="Preferred slot"
                value={slot}
                min={tomorrowLocal()}
                onChange={(e) => setSlot(e.currentTarget.value)}
                className={INPUT}
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                post(
                  "/api/viewings",
                  { propertyId, slotStart: new Date(slot).toISOString() },
                  "Viewing requested — the agent will confirm.",
                )
              }
              className={SUBMIT}
            >
              Request viewing
            </button>
          </div>
        )}

        {action === "offer" && (
          <div className="flex flex-wrap items-end gap-4">
            <label className="block">
              <span className={LABEL}>Your offer (£)</span>
              <input
                type="number"
                aria-label="Your offer"
                min={1}
                step={1000}
                value={offerPounds}
                onChange={(e) => setOfferPounds(e.currentTarget.valueAsNumber)}
                className={INPUT}
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                post(
                  "/api/offers",
                  // Pounds in the field, pence on the wire — the column is pence.
                  { propertyId, amountGBP: Math.round(offerPounds * 100) },
                  "Offer submitted — the agent will accept or reject it.",
                )
              }
              className={SUBMIT}
            >
              Submit offer
            </button>
          </div>
        )}

        {action === "message" && (
          <div>
            <label className="block">
              <span className={LABEL}>Message</span>
              <textarea
                aria-label="Message"
                rows={3}
                value={body}
                onChange={(e) => setBody(e.currentTarget.value)}
                className={INPUT}
                placeholder="Ask about the survey, the defects, or access."
              />
            </label>
            <button
              type="button"
              disabled={busy || body.trim().length === 0}
              onClick={() =>
                post("/api/chat", { propertyId, body }, "Message sent to the agent.")
              }
              className={`${SUBMIT} mt-4`}
            >
              Send message
            </button>
            <p className="mt-3 text-xs text-muted">
              Messages are saved and delivered, but do not yet update live.
            </p>
          </div>
        )}
      </div>

      <p aria-live="polite" className="mt-4 text-sm">
        {error ? <span className="text-danger">{error}</span> : null}
        {done ? <span className="text-success">{done}</span> : null}
      </p>
    </section>
  );
}
