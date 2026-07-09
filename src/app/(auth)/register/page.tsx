"use client";

import Link from "next/link";
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
      router.push(login?.error ? "/login" : "/");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-primary">Create your account</h1>
        <p className="mt-1 text-sm text-muted">
          Join PropLink UK as a buyer, investor or agent.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Full name
            </label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-accent focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted">
              At least 8 characters, with a letter and a number.
            </p>
          </div>

          <fieldset>
            <legend className="text-sm font-medium">I am a…</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {roles.map((r) => (
                <label
                  key={r.value}
                  className={`cursor-pointer rounded-md border p-2 text-center text-sm ${
                    form.role === r.value
                      ? "border-accent bg-pale font-semibold text-secondary"
                      : "border-line"
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
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-accent py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          Already registered?{" "}
          <Link href="/login" className="text-accent underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
