import Link from "next/link";

export const metadata = { title: "403 — Forbidden" };

export default function ForbiddenPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-surface px-6 py-24 text-center">
      <p className="text-6xl font-bold text-primary">403</p>
      <h1 className="mt-4 text-xl font-semibold text-body">
        You don&apos;t have access to this area
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        This portal is restricted to a different account role. If you believe this is a
        mistake, contact support.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-primary px-5 py-2.5 font-semibold text-white hover:bg-accent"
      >
        Back to home
      </Link>
    </main>
  );
}
