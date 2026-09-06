import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { KycPill } from "@/components/layout/KycPill";
import { PORTAL_HOME, PORTAL_LABEL } from "@/lib/portalHome";

/**
 * Global chrome: a flush, unfilled bar under a hairline rule (ADR-009).
 * Wordmark left, account right, nothing between them.
 *
 * **It carries almost no navigation.** The centred portal links and the `Log in`
 * link were removed on the product owner's instruction. What remains is the
 * wordmark (the route home), the account controls, and — signed in — a single
 * link to the portal that role owns (ADR-016). That one link is deliberate: the
 * portals would otherwise be reachable only by typed URL, and it shows a role
 * its own portal and no other. That makes the header a two-ended
 * flex rather than the three-column grid it needed when a middle column had to
 * be centred on the bar rather than on the space left between its flanks.
 *
 * Consequences worth knowing before adding anything back — see ADR-009:
 *
 * - `/marketplace` is now reached from the landing hero (CTA, search bar,
 *   category tiles, "View all") and nowhere else. There is no route to it from
 *   an interior page except the wordmark, then the hero.
 * - `/agent`, `/investor` and `/admin` have **no link anywhere in the app**. A
 *   signed-in agent reaches their portal by URL only. Whatever replaces this —
 *   an account menu, a portal switcher — is where those belong.
 *
 * The bar is light on every page, so everything in it is dark-on-light,
 * including `<KycPill>`.
 */
export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;

  return (
    // Interior pages: translucent white over the page's own ground, so the bar
    // reads as a sheet of glass rather than a band of a different colour.
    //
    // Landing: `<ChromeGate>` flags `data-overlay="true"` and the bar lifts out
    // of flow onto the hero's `brand` band (ADR-007, ADR-014). That ground is a
    // flat dark token rather than a photograph, so the bar needs no fill and no
    // haze — every control simply inverts to white, and the contrast is fixed at
    // 9.86:1 by the token instead of being tuned to an image.
    // The hairline stays in both modes; it is the bar's only edge.
    <header className="relative isolate border-b border-primary/10 bg-background/85 backdrop-blur-md group-data-[overlay=true]/chrome:absolute group-data-[overlay=true]/chrome:inset-x-0 group-data-[overlay=true]/chrome:top-0 group-data-[overlay=true]/chrome:z-30 group-data-[overlay=true]/chrome:border-white/15 group-data-[overlay=true]/chrome:bg-transparent group-data-[overlay=true]/chrome:backdrop-blur-none">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-6 lg:px-10">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight whitespace-nowrap text-primary group-data-[overlay=true]/chrome:text-white"
        >
          PropLink<span className="font-normal"> UK</span>
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              {/* The one signed-in link, and deliberately only one: it points
                  at the portal this role owns and at nothing else, so the three
                  self-serve roles never see each other's navigation (ADR-016).
                  Without it the portals would be reachable only by typed URL,
                  since the header carries no other navigation (ADR-009). */}
              <Link
                href={PORTAL_HOME[user.role]}
                className="hidden font-medium text-primary underline decoration-line underline-offset-4 group-data-[overlay=true]/chrome:text-white group-data-[overlay=true]/chrome:decoration-white/40 hover:decoration-accent sm:inline"
              >
                {PORTAL_LABEL[user.role]}
              </Link>
              {/* Investors only. KYC gates syndicate pledges and nothing else
                  (docs/CONTEXT.md §2), so showing an agent or a buyer a
                  "KYC: not started" chip is noise about a gate that will never
                  apply to them — and it leaks one role's concerns into another's
                  chrome (ADR-016). */}
              {(user.role === "INVESTOR" || user.role === "ADMIN") && (
                <KycPill status={user.kycStatus} />
              )}
              <span className="hidden text-muted group-data-[overlay=true]/chrome:text-white/85 sm:inline">
                {user.name}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-full border border-line px-4 py-2 font-medium text-primary transition-colors group-data-[overlay=true]/chrome:border-white/35 group-data-[overlay=true]/chrome:text-white hover:border-primary hover:bg-primary hover:text-white"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            /* The ink pill, answering the hero's `Create an account`. */
            <Link
              href="/register"
              className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white transition-colors group-data-[overlay=true]/chrome:bg-white group-data-[overlay=true]/chrome:text-primary hover:bg-accent group-data-[overlay=true]/chrome:hover:bg-accent group-data-[overlay=true]/chrome:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Get started
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
