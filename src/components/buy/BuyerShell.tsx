import { BuyerTabs, type BuyerTabItem } from "@/components/buy/BuyerTabs";

/**
 * The buyer portal's frame (ADR-020).
 *
 * **Why this is not `<PortalShell>`.** ADR-016 gave every portal one shell: a
 * full-bleed `primary` masthead with a marketing-scale headline over it. That
 * is right for the agent, investor and admin portals — they are tools, opened
 * by people who work here, and the band tells them which tool they are in.
 *
 * The buyer is a *customer*. They arrive to look at houses, and a black
 * masthead reading "Find the right defect" over a five-field finance form is a
 * B2B product wearing a consumer's job. So the buyer portal keeps the product's
 * type, colour and components, and drops the band: white chrome, the search
 * where the headline was, and the buyer's own activity as a quiet row of tabs
 * beside it.
 *
 * `<ChromeGate>` no longer lists `/buy` as an overlay route, so the global
 * header sits *above* this rather than floating on it — which is what makes the
 * light chrome possible at all.
 *
 * The tabs are the portal's whole navigation. The global header carries none
 * (ADR-009), so a page not listed here is an unreachable page. Every route must
 * already be role-gated by `src/middleware.ts` — this renders links, it does not
 * authorise anything.
 */
export function BuyerShell({
  tabs,
  children,
}: {
  tabs: BuyerTabItem[];
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col bg-background">
      {/* No tinted band. Three stacked full-width bands — header, title band,
          filter bar — put ~300px of chrome above the first property; this is
          one hairline-separated row on the page's own ground, so the chrome
          reads as a single object rather than a stack of them. */}
      <div className="border-b border-line">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-6 py-3">
          {/* The portal's single `<h1>`; every page below contributes `<h2>`s.
              Kept modest on purpose — on a search page the results are the
              headline, and marketing-scale type here would push them down. */}
          <h1 className="text-base font-semibold tracking-tight text-primary">
            Find your next home
          </h1>
          <BuyerTabs items={tabs} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl flex-1 px-6 pb-16">{children}</div>
    </main>
  );
}

/** Section heading inside the buyer portal's content area. */
export function BuyerSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/**
 * The buyer's empty state — a prompt, not a shrug.
 *
 * Every one of these lists starts empty, and the old shared `<PortalEmpty>` was
 * a grey dashed box saying so. On a consumer surface an empty list is the
 * moment to say what to do next, so this one takes a call to action.
 */
export function BuyerEmpty({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-6 py-14 text-center">
      <p className="text-base font-semibold text-primary">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
