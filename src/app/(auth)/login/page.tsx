"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  AUTH_BUTTON,
  AUTH_INPUT,
  AUTH_LABEL,
  AuthShell,
} from "@/components/auth/AuthShell";

/**
 * Where to go after a successful sign-in.
 *
 * `callbackUrl` is set by the middleware when it bounces an unauthenticated
 * request off a gated route, so honouring it returns the user to where they were
 * going. It is attacker-controllable, so **only a same-origin path is accepted**
 * — anything absolute, protocol-relative (`//evil.com`) or otherwise not a plain
 * `/path` falls back to the role router. Read from `location` rather than
 * `useSearchParams` so this page needs no Suspense boundary.
 */
function destination(): string {
  if (typeof window === "undefined") return "/portal";
  const raw = new URLSearchParams(window.location.search).get("callbackUrl");
  if (!raw) return "/portal";
  return /^\/(?!\/)/.test(raw) ? raw : "/portal";
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password");
        return;
      }
      // `callbackUrl` is what the middleware set when it bounced an
      // unauthenticated request off a gated route — honouring it returns the
      // user to where they were going. Otherwise `/portal` resolves their role
      // server-side, so this screen never needs the role map (ADR-016).
      router.push(destination());
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Log in"
      subtitle="Welcome back to PropLink UK."
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
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className={AUTH_LABEL}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={AUTH_INPUT}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="password" className={AUTH_LABEL}>
              Password
            </label>
            {/* The reset route existed from Sprint 1 but nothing linked to it
                from here, so the only way in was to know the URL. */}
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-secondary underline decoration-line underline-offset-4 hover:decoration-accent"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={AUTH_INPUT}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
          >
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className={AUTH_BUTTON}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        New to PropLink?{" "}
        <Link
          href="/register"
          className="font-semibold text-primary underline decoration-line underline-offset-4 hover:decoration-accent"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
