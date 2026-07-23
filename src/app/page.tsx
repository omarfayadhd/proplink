import Link from "next/link";

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
    </main>
  );
}
