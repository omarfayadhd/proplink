import Link from "next/link";

const METRICS = [
  { label: "Total Distress Inventory", value: "—" },
  { label: "Completed Syndicate Deals", value: "—" },
  { label: "Accrued Success Fees", value: "—" },
  { label: "Vetted Referrals Routed", value: "—" },
];

const PORTALS = [
  {
    name: "Marketplace",
    desc: "Search distressed UK listings by defect, EPC, budget, ROI and commute time.",
  },
  {
    name: "Investor Portal",
    desc: "KYC-verified syndicate pooling, refurb tracking and a live capital ledger.",
  },
  {
    name: "Agent Portal",
    desc: "List distressed stock, manage leads and build a verified credibility profile.",
  },
  {
    name: "Market Intelligence",
    desc: "Land Registry comparables, EPC uplift modelling and planning data feeds.",
  },
  {
    name: "Ecosystem Marketplace",
    desc: "Vetted partners: conveyancing, insurance, trades, surveyors and solicitors.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Global metrics strip (live values arrive with Task 1.5) */}
      <div className="border-b border-line bg-primary text-white">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-2 px-6 py-3 text-center sm:grid-cols-4">
          {METRICS.map((m) => (
            <div key={m.label}>
              <div className="text-lg font-semibold">{m.value}</div>
              <div className="text-xs text-pale/80">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-xl font-bold tracking-tight text-primary">
          PropLink<span className="text-accent"> UK</span>
        </span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login" className="font-medium text-secondary hover:text-accent">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-accent px-4 py-2 font-semibold text-white hover:bg-secondary"
          >
            Get started
          </Link>
        </nav>
      </header>

      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-primary sm:text-5xl">
            The UK distressed property market, on one platform
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
            Discovery, due diligence, syndication, refurbishment and completion — for
            agents, investors and buyers, end to end.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/register"
              className="rounded-md bg-accent px-6 py-3 font-semibold text-white hover:bg-secondary"
            >
              Create an account
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-line bg-white px-6 py-3 font-semibold text-secondary hover:border-accent"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
        <h2 className="text-2xl font-bold text-primary">Five portals, one loop</h2>
        <p className="mt-2 text-muted">
          Agent lists → investor funds → buyer purchases → deal completes on-platform.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PORTALS.map((p) => (
            <div key={p.name} className="rounded-lg border border-line bg-white p-5">
              <h3 className="font-semibold text-secondary">{p.name}</h3>
              <p className="mt-1 text-sm text-muted">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line bg-primary py-8 text-center text-sm text-white/80">
        <p>
          PropLink UK — Discovery · Due Diligence · Syndication · Refurbishment ·
          Completion
        </p>
        <p className="mt-2 text-xs">
          Syndicate participation is currently expression-of-interest only — no funds are
          collected on-platform. AI valuations are statistical projections and do not
          substitute for RICS-qualified surveys.
        </p>
      </footer>
    </main>
  );
}
