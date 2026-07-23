export const metadata = { title: "Privacy Policy" };

// PLACEHOLDER — final GDPR-compliant text arrives from the solicitor (H6.3)
// before launch. Structure mirrors what the final policy must cover.
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-bold text-primary">Privacy Policy</h1>
      <p className="mt-2 text-sm text-warning">
        Draft placeholder — the final solicitor-approved policy replaces this before
        launch (human task H6.3).
      </p>
      <div className="mt-8 space-y-6 text-sm leading-6 text-body">
        <section>
          <h2 className="font-semibold text-secondary">What we collect</h2>
          <p>
            Account details (name, email, role), listing and transaction data you create,
            and — for investors — identity-verification (KYC) records required by UK
            anti-money-laundering law.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-secondary">How long we keep it</h2>
          <p>
            Account data until you delete your account. KYC records are retained for 5
            years as required by UK AML regulations, even after account erasure.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-secondary">Your rights</h2>
          <p>
            You can request a copy of your data or erase your account from your account
            settings. Erasure anonymises your personal details immediately; legally
            retained records are kept in anonymised form.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-secondary">Cookies</h2>
          <p>
            Essential cookies keep you signed in. Analytics cookies are set only with
            consent via the cookie banner.
          </p>
        </section>
      </div>
    </main>
  );
}
