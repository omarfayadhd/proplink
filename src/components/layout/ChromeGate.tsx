"use client";

import { usePathname } from "next/navigation";

/**
 * Hides the global chrome (`SiteHeader`, `SiteFooter`) on the auth routes,
 * which carry their own full-bleed shell — see `<AuthShell>`.
 *
 * A client gate rather than a `(site)` route group. The group would be the more
 * idiomatic answer, but it means moving every non-auth route under
 * `src/app/(site)/`, which drags `@/app/agent/actions` — imported by a component
 * and a unit test — to `@/app/(site)/agent/actions`. The cost of the gate is one
 * `auth()` call still running for a header that is then discarded, on two
 * unauthenticated pages. That is the cheaper trade.
 *
 * `usePathname` resolves during SSR in the App Router, so the chrome is absent
 * from the server-rendered HTML too — there is no flash of a header that then
 * disappears.
 *
 * Whole-group, not just `/login` and `/register`: password reset and email
 * verification are the same flow, and chrome that reappears when you click
 * "Forgot password?" reads as a bug.
 */
const BARE_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

/**
 * Routes whose chrome sits *on* the page rather than above it — each opens with
 * a full-bleed dark band that runs to the top of the viewport, so the header
 * floats on it and inverts to white (ADR-007, ADR-014, ADR-015). `/` opens on
 * the `brand` band; `/marketplace` on a `primary` masthead.
 *
 * Exact match, so `/marketplace/[id]` is deliberately excluded: the detail page
 * opens on its gallery and needs the header in flow above it.
 *
 * Carried as a data attribute on a wrapper rather than a prop because
 * `<SiteHeader>` is an async server component: the layout renders it, and the
 * layout has no pathname. `<ChromeGate>` is already the client boundary that
 * knows the route, so it publishes the variant and the header's own utilities
 * (`group-data-[overlay=true]/chrome:…`) respond to it. Utilities, not
 * hand-written CSS — see `plateWash.ts` for why a bespoke class in
 * `globals.css` is a trap here.
 */
const OVERLAY_ROUTES = ["/", "/marketplace"];

/**
 * Route *prefixes* whose every page opens on a portal masthead (ADR-016), so
 * `/agent/listings` inverts the header exactly as `/agent` does. Kept separate
 * from the exact list because `/marketplace` must invert while
 * `/marketplace/[id]` must not.
 *
 * `/buy` is deliberately absent (ADR-020): the buyer portal is the one consumer
 * portal and wears light chrome, so its header sits above the page in flow like
 * the detail page's, rather than floating inverted on a dark band.
 */
const OVERLAY_PREFIXES = ["/agent", "/investor", "/admin"];

export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (BARE_ROUTES.includes(pathname)) return null;

  return (
    <div
      className="group/chrome contents"
      data-overlay={
        OVERLAY_ROUTES.includes(pathname) ||
        OVERLAY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
          ? "true"
          : "false"
      }
    >
      {children}
    </div>
  );
}
