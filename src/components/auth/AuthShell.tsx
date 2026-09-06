import Link from "next/link";
import { PLATE_WASH } from "@/lib/plateWash";

/**
 * Full-bleed shell for every `(auth)` route: a navy brand plate on the left,
 * the form on the right. The global chrome is suppressed on these routes
 * (`<ChromeGate>`), so this is the whole page.
 *
 * The plate is the landing hero's own material — `PLATE_WASH` over `bg-primary`
 * with a seed photograph blended in by `mix-blend-luminosity`, the same
 * treatment the category tiles use — so signing in does not feel like leaving
 * the product. It also carries the wordmark, which is the only route back to
 * `/` once the header is gone.
 *
 * Below `lg` the plate drops to a compact navy header strip: a half-height
 * photograph above a form is decoration competing with the task.
 */
export function AuthShell({
  title,
  subtitle,
  aside,
  children,
}: {
  /** Page heading. Rendered as the `<h1>` — E2E specs match on it. */
  title: string;
  subtitle: string;
  /** Copy for the brand plate — what this account is for. */
  aside: { headline: React.ReactNode; points: string[] };
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* ------------------------------------------------------ brand plate */}
      <aside className="relative isolate flex flex-col justify-between overflow-hidden bg-primary px-6 py-6 text-white sm:px-10 lg:w-[46%] lg:py-12 xl:px-16">
        <div
          aria-hidden
          // Damped, as on the header pill: at full strength the accent radial
          // (`at 96% 8%`) is a hard flare in the plate's top corner.
          className="pointer-events-none absolute inset-0 -z-20 opacity-75"
          style={{ backgroundImage: PLATE_WASH }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/uploads/seed/plate-01.jpg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-30 mix-blend-luminosity"
        />

        <Link
          href="/"
          className="text-lg font-bold tracking-tight whitespace-nowrap text-white"
        >
          PropLink<span className="font-normal"> UK</span>
        </Link>

        {/* The pitch only appears where there is room for it; on a phone the
            plate is just a branded strip above the form. */}
        <div className="hidden lg:block">
          <p className="font-display font-semibold text-4xl leading-[1.1] text-white xl:text-5xl">
            {aside.headline}
          </p>
          <ul className="mt-10 space-y-4">
            {aside.points.map((point) => (
              <li key={point} className="flex gap-3 text-sm text-pale/80">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 h-4 w-4 shrink-0 text-white"
                >
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* The EOI position is a compliance statement, not marketing — it is on
            every page via `SiteFooter`, and this route has no footer. */}
        <p className="hidden max-w-sm text-xs leading-relaxed text-pale/60 lg:block">
          Syndicate participation is currently expression-of-interest only — no funds are
          collected on-platform.
        </p>
      </aside>

      {/* ------------------------------------------------------------- form */}
      <div className="flex flex-1 items-center justify-center bg-surface px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <h1 className="font-display font-semibold text-3xl text-primary sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </main>
  );
}

/** Shared field styling, so the five auth forms cannot drift apart. */
export const AUTH_INPUT =
  "mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary transition-colors placeholder:text-muted/70 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30";

export const AUTH_LABEL = "block text-sm font-medium text-primary";

export const AUTH_BUTTON =
  "w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50";
