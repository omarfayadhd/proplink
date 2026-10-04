"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  AUTH_BUTTON,
  AUTH_INPUT,
  AUTH_LABEL,
  AuthShell,
} from "@/components/auth/AuthShell";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  // An admin-invited agent arrives here with no password at all (ADR-019), so
  // the copy and the consumed token pool both switch.
  const invite = params.get("invite") === "1";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          purpose: invite ? "AGENT_INVITE" : "PASSWORD_RESET",
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? (invite ? "Could not set password" : "Reset failed"));
        return;
      }
      router.push(invite ? "/login?welcome=1" : "/login?reset=1");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <Shell invite={invite}>
        <p className="mt-4 text-sm text-danger">
          {invite ? (
            "Missing invite token — use the link from your invitation email, or ask an administrator to resend it."
          ) : (
            <>
              Missing reset token — use the link from your email, or{" "}
              <Link href="/forgot-password" className="text-accent underline">
                request a new one
              </Link>
              .
            </>
          )}
        </p>
      </Shell>
    );
  }

  return (
    <Shell invite={invite}>
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className={AUTH_LABEL}>
            {invite ? "Choose a password" : "New password"}
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={AUTH_INPUT}
          />
          <p className="mt-1 text-xs text-muted">
            At least 8 characters, with a letter and a number.
          </p>
        </div>
        {error && (
          <p
            role="alert"
            data-testid="agent-form-error"
            className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
          >
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting} className={AUTH_BUTTON}>
          {submitting
            ? "Saving…"
            : invite
              ? "Set password and continue"
              : "Set new password"}
        </button>
      </form>
    </Shell>
  );
}

function Shell({ invite, children }: { invite: boolean; children: React.ReactNode }) {
  return (
    <AuthShell
      title={invite ? "Welcome to PropLink UK" : "Choose a new password"}
      subtitle={
        invite
          ? "Your agent account is ready — set a password to sign in."
          : "Pick something you have not used here before."
      }
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
      {children}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
