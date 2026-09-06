import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CategoryTiles, type CategoryTile } from "@/components/marketing/CategoryTiles";
import { HeroStage } from "@/components/marketing/HeroStage";
import { HeroStats } from "@/components/marketing/HeroStats";
import { RenderObject } from "@/components/marketing/RenderObject";
import heroImage from "@/assets/heroimage.jpeg";
import { searchService } from "@/services/search";
import type { DistressTag } from "@/generated/prisma/enums";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** Category tiles: label + the distress tags their marketplace search filters on. */
const CATEGORIES: { label: string; tags: DistressTag[]; image: string }[] = [
  {
    label: "Probate sales",
    tags: ["PROBATE"],
    image: "/marketing/categories/probate.jpg",
  },
  {
    label: "Fire & flood damage",
    tags: ["FIRE_DAMAGE", "WATER_DAMAGE"],
    image: "/marketing/categories/fire-flood.jpg",
  },
  {
    label: "Structural defects",
    tags: ["SUBSIDENCE", "ROOF_REQUIRED"],
    image: "/marketing/categories/structural.jpg",
  },
  {
    label: "Refurbishment stock",
    tags: ["RENOVATION_NEEDED", "DAMP"],
    image: "/marketing/categories/refurb.jpg",
  },
];

/** The ecosystem band's index. Decorative texture — see the band's comment. */
const ECOSYSTEM = [
  "Conveyancers",
  "Surveyors",
  "Structural engineers",
  "Insurers",
  "Damp specialists",
  "Roofing",
  "Asbestos removal",
  "Planning consultants",
];

const STEPS = [
  {
    title: "Agent lists",
    desc: "Distressed stock goes live with disclosed defects, EPC rating and a target refurbishment ROI.",
  },
  {
    title: "Investors pool",
    desc: "KYC-verified members register expressions of interest against a deal and its refurb plan.",
  },
  {
    title: "Buyer purchases",
    desc: "Enquiries, viewings and offers run through the platform, with every lead attributed.",
  },
  {
    title: "Deal completes",
    desc: "Refurbishment is tracked to completion and the outcome joins the agent's verified record.",
  },
];

/**
 * The five portals. `icon` is 24×24 path data on one set of terms —
 * `fill="none"`, 1.6 stroke, round joins — so the whole marketing surface draws
 * from one glyph vocabulary.
 */
const PORTALS = [
  {
    name: "Marketplace",
    desc: "Search by defect, EPC band, budget and target ROI.",
    // A house inside a magnifier: search over stock. The roof needs its walls —
    // a bare chevron in the lens reads as a zoom-in caret, not a building.
    icon: "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z M15.4 15.4 20.2 20.2 M6.9 11.7 10.5 8.7l3.6 3 M8.3 10.5v3.8h4.4v-3.8",
  },
  {
    name: "Investor Portal",
    desc: "Syndicate pooling, refurb tracking, capital ledger.",
    // An exploded pie — a share of a whole, not coins: under EOI mode no money
    // moves. Two radii inside one circle read as a clock face, so the slice is
    // drawn pulled out instead.
    icon: "M12 5A7.5 7.5 0 1 1 4.5 12.5L12 12.5Z M10.6 3.6A7.5 7.5 0 0 0 3.1 11.1L10.6 11.1Z",
  },
  {
    name: "Agent Portal",
    desc: "List stock, manage leads, build a verified record.",
    // Verification seal — the portal's output is a credible record.
    icon: "M12 3.4l2.2 2.3 3.2-.3-.3 3.2 2.3 2.2-2.3 2.2.3 3.2-3.2-.3-2.2 2.3-2.2-2.3-3.2.3.3-3.2-2.3-2.2 2.3-2.2-.3-3.2 3.2.3Z M9.6 10.9l1.7 1.7 3.2-3.6",
  },
  {
    name: "Market Intelligence",
    desc: "Comparables, EPC uplift and planning feeds.",
    icon: "M3.5 20h17 M6.5 20v-5 M11 20V9 M15.5 20v-7 M19.5 20V6",
  },
  {
    name: "Ecosystem",
    desc: "Vetted conveyancers, surveyors, insurers and trades.",
    // A hub and its spokes: vetted third parties routed through the platform.
    icon: "M12 9.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Z M5 4.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z M19 4.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z M12 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z M10.1 10.3 6.6 7.8 M13.9 10.3l3.5-2.5 M12 14.6V18",
  },
];

/**
 * The hero's entrance (ADR-010). `<HeroStage>` flips `data-entered` one frame
 * after mount and everything wearing this rises into place, staggered by its
 * own `delay-*`.
 *
 * Transitions on utilities, not `@keyframes`: a hand-added rule in
 * `globals.css` goes stale under Turbopack's Tailwind cache (`plateWash.ts`),
 * and `motion-reduce:` then turns the whole thing off with no second code path.
 */
const RISE =
  "translate-y-4 opacity-0 transition-[opacity,transform] duration-700 ease-out group-data-[entered=true]/hero:translate-y-0 group-data-[entered=true]/hero:opacity-100 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none";

/**
 * One masked line of the hero headline: an `overflow-hidden` block with its
 * words sitting a full line below, released when the stage says so.
 *
 * The mask is why the headline is split into explicit lines rather than left to
 * wrap — a mask can only reveal a line whose bounds it knows. The trade-off is
 * that the line breaks are now authored, which at these sizes they should be
 * anyway; the accessible name is unaffected because the spans carry no roles.
 */
function Line({ children, delay = "" }: { children: React.ReactNode; delay?: string }) {
  return (
    // `pb-[0.08em]` on the mask, matched by `-mb-[0.08em]`: descenders overrun
    // the line box, and a mask clipped to the box shears them off.
    <span className="-mb-[0.08em] block overflow-hidden pb-[0.08em]">
      <span
        className={`block translate-y-full transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[entered=true]/hero:translate-y-0 motion-reduce:translate-y-0 motion-reduce:transition-none ${delay}`}
      >
        {children}{" "}
      </span>
    </span>
  );
}

/** Portal glyph: a pale disc on the page's `surface`, one step darker than it. */
function PortalIcon({ d }: { d: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pale text-secondary transition-colors group-hover:bg-primary group-hover:text-white">
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[18px] w-[18px]"
      >
        <path d={d} />
      </svg>
    </span>
  );
}

/**
 * Marketing landing page — editorial/luxury layout: a full-bleed photographic
 * hero, display headings that pair a semibold phrase with a light one (the
 * weight contrast that replaced the roman/italic device when the serif went —
 * ADR-012), oversized figures, and staggered mosaics.
 *
 * Server-rendered end to end. Every figure, count and card is live data, so the
 * shop window can never drift from the marketplace it advertises.
 *
 * The portal list is deliberately not links — `/investor`, `/intel` and
 * `/ecosystem` are later-sprint routes, and a landing page whose links 404 is
 * worse than one that describes what is coming. `SiteHeader` remains the single
 * place those routes are wired up.
 */
export default async function Home() {
  const categoryCounts = await Promise.all(
    CATEGORIES.map((c) => searchService.count({ distressTags: c.tags })),
  );

  const tiles: CategoryTile[] = CATEGORIES.map((category, i) => ({
    label: category.label,
    count: categoryCounts[i],
    href: `/marketplace?tags=${category.tags.join(",")}`,
    image: category.image,
  }));

  return (
    <main className="flex flex-1 flex-col bg-background">
      {/* ================================================================ 1/6 */}
      {/* Hero — a full-bleed `brand` band carrying one floating object, the
          reference's opening move (ADR-014). The header floats on it; the
          content column carries its own top padding to clear the bar. */}
      <HeroStage>
        <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 pt-28 pb-24 sm:pt-32 lg:px-10">
          <div className="lg:max-w-[52%]">
            <p
              className={`${RISE} flex items-center gap-4 text-[11px] tracking-[0.22em] text-white uppercase`}
            >
              <span
                aria-hidden
                className="h-px w-0 bg-white/40 transition-[width] delay-[400ms] duration-[900ms] ease-out group-data-[entered=true]/hero:w-12 motion-reduce:w-12 motion-reduce:transition-none"
              />
              UK distressed property
            </p>

            {/* Uppercase via CSS, not in the markup: the accessible name stays
                sentence-case for screen readers and for the e2e spec. Each line
                is a `Line` — an overflow-hidden mask with the words translated
                below it, released on `data-entered`. */}
            <h1 className="font-display mt-7 text-[clamp(2.75rem,6vw,5.5rem)] leading-[0.92] font-semibold tracking-[-0.035em] text-white">
              <Line>Redefining</Line>
              <Line delay="delay-[110ms]">distressed</Line>
              <Line delay="delay-[220ms]">property</Line>
              <Line delay="delay-[330ms]">investment</Line>
            </h1>

            <p
              className={`${RISE} mt-8 max-w-md text-base leading-relaxed text-pale/80 delay-[620ms]`}
            >
              Disclosed defects, EPC rating and target refurbishment ROI on the face of
              every listing.
            </p>
          </div>
        </div>

        {/* Scroll cue, bottom-right as the reference places it. `aria-hidden` —
            it describes the page's shape, not its content. */}
        <div
          aria-hidden
          className={`${RISE} pointer-events-none absolute right-6 bottom-10 flex flex-col items-center gap-3 delay-[900ms] lg:right-10`}
        >
          <span className="text-[10px] tracking-[0.24em] text-white/70 uppercase">
            Scroll
          </span>
          <span className="relative block h-10 w-px overflow-hidden bg-white/25">
            <span className="animate-scroll-hint absolute inset-x-0 top-0 block h-4 bg-white motion-reduce:animate-none" />
          </span>
        </div>
      </HeroStage>

      {/* ================================================================ 2/6 */}
      {/* Core loop — the reference's second block: near-black, one oversized
          centred headline with an object behind it, then a four-up row of short
          descriptions beneath. */}
      <section className="relative isolate overflow-hidden bg-primary py-28 sm:py-36">
        {/* Offset to the upper right rather than centred: the reference floats
            its objects *beside* the giant type, and a centred one sits directly
            behind the caption where it costs the copy its contrast. */}
        <RenderObject
          variant="stack"
          className="pointer-events-none absolute -top-10 -right-12 -z-10 h-64 w-64 opacity-45 sm:h-80 sm:w-80 lg:-right-4 lg:h-96 lg:w-96"
        />

        <div className="mx-auto w-full max-w-6xl px-6">
          <p className="text-center text-[11px] tracking-[0.22em] text-pale/60 uppercase">
            The core loop
          </p>
          <h2 className="font-display mx-auto mt-6 max-w-4xl text-center text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] font-semibold tracking-[-0.035em] text-white">
            One platform, <span className="font-light">whole deal</span>
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-center text-base leading-relaxed text-pale/75">
            A distressed deal normally scatters across four disconnected businesses. Here
            it stays in one place, with the outcome recorded against the agent who
            delivered it.
          </p>

          <ol className="mt-20 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="border-t border-white/15 pt-5">
                {/* Not `text-accent`: ember on `primary` is 3.46:1 and is the
                    one pair the palette forbids outright (ADR-009). */}
                <span className="text-sm tabular-nums text-pale/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-pale/70">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================================================================ 3/6 */}
      {/* Categories — the reference's split block: subject left, oversized type
          right. The terrace photograph lives here now rather than under the
          hero's type, where it was a backdrop; here it is the subject. */}
      <section className="overflow-hidden bg-primary pb-28 sm:pb-36">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-4/3 overflow-hidden rounded-3xl lg:aspect-square">
            <Image
              src={heroImage}
              alt="A scaffolded Georgian terrace mid-restoration, in fog"
              fill
              sizes="(min-width: 1024px) 40vw, 90vw"
              placeholder="blur"
              className="object-cover object-[30%_center]"
            />
          </div>

          <div>
            <p className="text-[11px] tracking-[0.22em] text-pale/60 uppercase">
              By distress type
            </p>
            <h2 className="font-display mt-6 text-[clamp(2.25rem,4.6vw,3.75rem)] leading-[0.98] font-semibold tracking-[-0.03em] text-white">
              Buy the <span className="font-light">defect</span> you understand
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-pale/75">
              Every listing carries its disclosed defects, EPC rating and the agent&apos;s
              target refurbishment ROI — so due diligence starts before you enquire, not
              after.
            </p>
            <Link
              href="/marketplace"
              className="mt-8 inline-block rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-primary transition-colors hover:bg-accent hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            >
              Browse distressed listings
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-16 w-full max-w-6xl px-6">
          <CategoryTiles tiles={tiles} />
        </div>
      </section>

      {/* ================================================================ 4/6 */}
      {/* Statement — the reference's light block: centred oversized type with a
          caption, and here the live figures beneath it. */}
      <section className="bg-surface py-28 sm:py-36">
        <div className="mx-auto w-full max-w-5xl px-6">
          <p className="text-center text-[11px] tracking-[0.22em] text-muted uppercase">
            About PropLink
          </p>
          <h2 className="font-display mt-6 text-center text-[clamp(2.25rem,5vw,4.25rem)] leading-[1] font-semibold tracking-[-0.03em] text-primary">
            We handle <span className="font-light">every stage</span> of a distressed UK
            deal
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-center text-base leading-relaxed text-muted">
            Discovery, due diligence, syndication and refurbishment — on one platform, for
            agents, investors and buyers alike.
          </p>
          <HeroStats />
        </div>
      </section>

      {/* ================================================================ 5/6 */}
      {/* Platform — the five-portal index, then the ecosystem band. Rows rather
          than a grid: five items in a grid of three leaves a hole that reads as
          a missing sixth portal. */}
      <section className="bg-surface pb-28 sm:pb-36">
        <div className="mx-auto w-full max-w-6xl px-6">
          <p className="text-[11px] tracking-[0.22em] text-muted uppercase">
            The platform
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold text-primary sm:text-4xl">
            Five portals, <span className="font-light">shared data</span>
          </h2>

          <dl className="mt-12 border-t border-line">
            {PORTALS.map((portal, i) => (
              <div
                key={portal.name}
                className="group grid items-baseline gap-x-6 gap-y-2 border-b border-line py-6 sm:grid-cols-[3rem_minmax(0,15rem)_minmax(0,1fr)] sm:py-7"
              >
                <dt className="text-sm tabular-nums text-primary/70 transition-colors group-hover:text-accent">
                  {String(i + 1).padStart(2, "0")}
                </dt>
                {/* The glyph lives inside the `<dd>` pair's first cell: a `<dl>`'s
                    div wrapper may only hold `dt`/`dd`, so it cannot be a sibling
                    of them. */}
                <dd className="flex items-center gap-3 text-base font-semibold text-primary sm:text-lg">
                  <PortalIcon d={portal.icon} />
                  {portal.name}
                </dd>
                <dd className="text-sm leading-relaxed text-muted">{portal.desc}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* The reference's scrolling band, carrying the ecosystem's trades
            rather than payment logos. `aria-hidden` and not links: a moving
            target is a hostile click, and none of these have routes yet. */}
        <div
          aria-hidden
          className="relative mt-24 overflow-hidden border-y border-line bg-background py-5"
        >
          <div className="animate-marquee flex w-max motion-reduce:animate-none">
            {[0, 1].map((copy) => (
              <ul key={copy} className="flex shrink-0 items-center">
                {ECOSYSTEM.map((trade) => (
                  <li
                    key={trade}
                    className="flex items-center gap-8 pr-8 text-sm tracking-[0.12em] text-muted uppercase"
                  >
                    <span className="text-accent">&#9670;</span>
                    {trade}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ 6/6 */}
      {/* Closing CTA — back to the `brand` band, as the reference closes. */}
      <section className="relative isolate overflow-hidden bg-brand py-28 sm:py-36">
        <RenderObject
          variant="loop"
          className="pointer-events-none absolute -right-16 -bottom-12 -z-10 h-80 w-80 opacity-60 sm:h-[26rem] sm:w-[26rem]"
        />
        <div className="mx-auto w-full max-w-4xl px-6">
          <h2 className="font-display max-w-2xl text-[clamp(2.25rem,5vw,4.25rem)] leading-[0.98] font-semibold tracking-[-0.03em] text-white">
            Start with the listings,{" "}
            <span className="font-light">or set up your account</span>
          </h2>
          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              href="/register"
              className="w-full rounded-full bg-white px-9 py-4 text-center text-sm font-semibold text-primary transition-colors hover:bg-accent hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand sm:w-auto"
            >
              Get started
            </Link>
            <Link
              href="/marketplace"
              className="w-full rounded-full border border-white/35 px-9 py-4 text-center text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10 sm:w-auto"
            >
              Browse listings
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
