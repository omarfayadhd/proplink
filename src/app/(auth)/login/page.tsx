"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

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
      router.push("/");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-primary">Log in</h1>
        <p className="mt-1 text-sm text-muted">Welcome back to PropLink UK.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-accent focus:outline-none"
            />
          </div>

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
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          New to PropLink?{" "}
          <Link href="/register" className="text-accent underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
