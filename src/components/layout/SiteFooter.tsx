import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-primary py-8 text-sm text-white/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 text-center sm:text-left">
        <p>
          PropLink UK — Discovery · Due Diligence · Syndication · Refurbishment ·
          Completion
        </p>
        <p className="text-xs">
          Syndicate participation is currently expression-of-interest only — no funds are
          collected on-platform. AI valuations are statistical projections and do not
          substitute for RICS-qualified surveys.
        </p>
        <p className="text-xs">
          <Link href="/privacy" className="underline hover:text-white">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="underline hover:text-white">
            Terms
          </Link>
        </p>
      </div>
    </footer>
  );
}
