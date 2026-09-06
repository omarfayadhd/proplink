import { PortalNav } from "@/components/portal/PortalNav";

/**
 * The frame every role portal wears (ADR-016).
 *
 * Same shell as `/marketplace` (ADR-015): a `primary` masthead running to the
 * top of the viewport with the header floating on it, the reference's
 * semibold/light heading pairing at tool scale, and a hairline sub-nav — then
 * the working content below at ordinary density. The portals are tools; the
 * band is where the marketing language lives.
 *
 * **The sub-nav is the portal's whole navigation.** The global header carries
 * none (ADR-009), so a portal that does not list its own pages here has
 * unreachable pages.
 *
 * Every route passed in must already be role-gated by `src/middleware.ts` —
 * this renders links, it does not authorise anything.
 *
 * It lives in each portal's **layout**, not its pages: the masthead carries the
 * portal's single `<h1>` and every page below contributes `<h2>`s. Putting it in
 * a page as well as a layout is how `/agent` ended up with two `<h1>`s.
 */

export interface PortalNavItem {
  href: string;
  label: string;
}

export function PortalShell({
  eyebrow,
  title,
  titleTail,
  standfirst,
  nav,
  aside,
  children,
}: {
  eyebrow: string;
  /** Rendered semibold. */
  title: string;
  /** Rendered light, completing the heading — the page's weight pairing. */
  titleTail?: string;
  standfirst?: string;
  nav: PortalNavItem[];
  /** Portal-specific control on the band, e.g. the agent profile switcher. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-primary pt-28 pb-0 sm:pt-32">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-[11px] tracking-[0.22em] text-pale/60 uppercase">
              {eyebrow}
            </p>
            {aside}
          </div>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
            <h1 className="font-display max-w-2xl text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-white">
              {title}
              {titleTail ? <span className="font-light"> {titleTail}</span> : null}
            </h1>
            {standfirst ? (
              <p className="max-w-sm text-sm leading-relaxed text-pale/75">
                {standfirst}
              </p>
            ) : null}
          </div>

          {/* Sub-nav on the band's lower edge, so the band and the content it
              governs are visibly one object. */}
          <PortalNav items={nav} />
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-6 py-10">{children}</div>
    </main>
  );
}

/** A dashboard figure: one number over a small-caps label, on a hairline. */
export function StatCard({
  value,
  label,
  hint,
}: {
  value: string | number;
  label: string;
  hint?: string;
}) {
  return (
    <div className="border-t border-line pt-4">
      <p className="text-3xl font-semibold tracking-tight text-primary">{value}</p>
      <p className="mt-2 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
        {label}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** Section heading inside a portal's content area. */
export function PortalSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** The honest empty state — every one of these portals starts empty. */
export function PortalEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-line bg-surface px-5 py-8 text-center text-sm text-muted">
      {children}
    </p>
  );
}
