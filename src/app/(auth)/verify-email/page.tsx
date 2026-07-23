import Link from "next/link";
import { verifyEmail } from "@/services/users/emailVerification";

export const metadata = { title: "Verify email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token
    ? await verifyEmail(token)
    : ({ ok: false, reason: "missing" } as const);

  return (
    <main className="flex flex-1 items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-8 text-center shadow-sm">
        {result.ok ? (
          <>
            <h1 className="text-2xl font-bold text-success">Email verified ✓</h1>
            <p className="mt-2 text-sm text-muted">
              Your address is confirmed. You can now log in.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-md bg-accent px-5 py-2.5 font-semibold text-white hover:bg-secondary"
            >
              Log in
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-danger">Verification failed</h1>
            <p className="mt-2 text-sm text-muted">
              {result.reason === "expired"
                ? "This link has expired. Log in to request a new one."
                : "This verification link is invalid or has already been used."}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-md border border-line px-5 py-2.5 font-semibold text-secondary hover:border-accent"
            >
              Back to log in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
