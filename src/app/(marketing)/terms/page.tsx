export const metadata = { title: "Terms of Service" };

// PLACEHOLDER — final text from the solicitor (H6.3), including the
// counsel-approved EOI syndication language (H4.3), replaces this before launch.
export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-bold text-primary">Terms of Service</h1>
      <p className="mt-2 text-sm text-warning">
        Draft placeholder — final solicitor-approved terms replace this before launch
        (human task H6.3).
      </p>
      <div className="mt-8 space-y-6 text-sm leading-6 text-body">
        <section>
          <h2 className="font-semibold text-secondary">The platform</h2>
          <p>
            PropLink UK is a marketplace and information platform for distressed UK
            property. Listings are provided by independent agents who are responsible for
            their accuracy, including disclosure of all material information.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-secondary">
            Syndication — expression of interest only
          </h2>
          <p>
            Syndicate participation is currently an expression of interest only. No funds
            are collected, held, or transferred on-platform. Equity previews are
            illustrative and are not an offer or financial promotion.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-secondary">Valuations</h2>
          <p>
            AI valuations are statistical projections based on registry comparable
            databases and do not substitute for official RICS-qualified surveys or
            official planning guidance.
          </p>
        </section>
      </div>
    </main>
  );
}
