"use client";

import Link from "next/link";
import {
  AUTH_BUTTON,
  AUTH_INPUT,
  AUTH_LABEL,
  AuthShell,
} from "@/components/auth/AuthShell";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We will email you a link to choose a new one."
      aside={{
        headline: (
          <>
            The whole distressed deal,
            <span className="mt-1 block font-light">in one place</span>
          </>
        ),
        points: [
          "Search live UK distressed stock by defect, EPC band and target ROI",
          "Track enquiries, viewings and offers against every listing",
          "Register expressions of interest in syndicated refurbishments",
        ],
      }}
    >
      {sent ? (
        <p className="text-sm text-body">
          If an account exists for <strong>{email}</strong>, a reset link is on its way.
          Check your inbox (and the dev console when running locally).
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className={AUTH_LABEL}>
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={AUTH_INPUT}
            />
          </div>
          <button type="submit" disabled={submitting} className={AUTH_BUTTON}>
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-muted">
        <Link
          href="/login"
          className="font-semibold text-primary underline decoration-line underline-offset-4 hover:decoration-accent"
        >
          Back to log in
        </Link>
      </p>
    </AuthShell>
  );
}
