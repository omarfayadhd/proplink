import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
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
    <AuthShell
      title={result.ok ? "Email verified" : "Verification failed"}
      subtitle={
        result.ok
          ? "Your address is confirmed. You can now log in."
          : result.reason === "expired"
            ? "This link has expired. Log in to request a new one."
            : "This verification link is invalid or has already been used."
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
      <Link
        href="/login"
        className="block w-full rounded-full bg-primary py-3.5 text-center text-sm font-semibold text-white transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        {result.ok ? "Log in" : "Back to log in"}
      </Link>
    </AuthShell>
  );
}
