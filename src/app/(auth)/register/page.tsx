"use client";

import Link from "next/link";
import {
  AUTH_BUTTON,
  AUTH_INPUT,
  AUTH_LABEL,
  AuthShell,
} from "@/components/auth/AuthShell";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

const roles = [
  { value: "BUYER", label: "Buyer", hint: "Search and purchase property" },
  { value: "INVESTOR", label: "Investor", hint: "Fund refurbishment projects" },
  { value: "AGENT", label: "Agent", hint: "List distressed stock" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "BUYER",
    gdprConsent: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const firstIssue =
          data?.issues && (Object.values(data.issues).flat()[0] as string);
        setError(firstIssue ?? data?.error ?? "Registration failed");
        return;
      }
      const login = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      // `/portal` resolves the new account's role server-side and forwards to
      // its dashboard, rather than dropping a fresh user on the landing page
      // with no route into their own portal (ADR-016).
      router.push(login?.error ? "/login" : "/portal");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join PropLink UK as a buyer, investor or agent."
      aside={{
        headline: (
          <>
            Distressed property,
            <span className="mt-1 block font-light">end to end</span>
          </>
        ),
        points: [
          "Buyers and investors: search, enquire, book viewings and make offers",
          "Agents: list stock with disclosed defects and build a verified record",
          "Every listing carries its EPC rating and target refurbishment ROI",
        ],
      }}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className={AUTH_LABEL}>
            Full name
          </label>
          <input
            id="name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={AUTH_INPUT}
          />
        </div>

        <div>
          <label htmlFor="email" className={AUTH_LABEL}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={AUTH_INPUT}
          />
        </div>

        <div>
          <label htmlFor="password" className={AUTH_LABEL}>
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={AUTH_INPUT}
          />
          <p className="mt-1 text-xs text-muted">
            At least 8 characters, with a letter and a number.
          </p>
        </div>

        <fieldset>
          <legend className={AUTH_LABEL}>I am a…</legend>
          <div className="mt-2 grid grid-cols-3 gap-2.5">
            {roles.map((r) => (
              <label
                key={r.value}
                className={`cursor-pointer rounded-xl border p-3 text-center text-sm transition-colors ${
                  form.role === r.value
                    ? "border-accent bg-pale font-semibold text-secondary"
                    : "border-line bg-white hover:border-secondary"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={r.value}
                  checked={form.role === r.value}
                  onChange={() => setForm({ ...form, role: r.value })}
                  className="sr-only"
                />
                {r.label}
                <span className="mt-1 block text-xs font-normal text-muted">
                  {r.hint}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            required
            checked={form.gdprConsent}
            onChange={(e) => setForm({ ...form, gdprConsent: e.target.checked })}
            className="mt-1"
          />
          <span>
            I agree to the{" "}
            <Link href="/privacy" className="text-accent underline">
              privacy policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="text-accent underline">
              terms of service
            </Link>
            .
          </span>
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
          >
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className={AUTH_BUTTON}>
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Already registered?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary underline decoration-line underline-offset-4 hover:decoration-accent"
        >
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
