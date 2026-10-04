import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listSavedForCards } from "@/services/listings/savedProperties";
import { PropertyCard } from "@/components/marketplace/PropertyCard";
import { BuyerEmpty } from "@/components/buy/BuyerShell";

export const dynamic = "force-dynamic";

/**
 * The buyer's shortlist (ADR-020) — the same cards as the search, so a buyer
 * can compare what they saved on the terms they saved it: photo, price, EPC
 * and disclosed defects side by side.
 *
 * Every heart here starts filled, and un-hearting one removes it from the list
 * on the next render. That is deliberate: this page *is* the saved set, so a
 * card that stayed after being unsaved would be lying about what it is.
 */
export default async function SavedPage() {
  const session = await auth();
  const user = session?.user;
  if (!user) redirect("/login");
  if (!["BUYER", "ADMIN"].includes(user.role)) redirect("/403");

  // Scoped by `userId` inside the service's `where` — never filtered after the
  // fact, so one buyer can never read another's shortlist.
  const saved = await listSavedForCards(user.id);

  if (saved.length === 0) {
    return (
      <BuyerEmpty
        title="Nothing saved yet"
        action={
          <Link
            href="/buy"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent"
          >
            Browse properties
          </Link>
        }
      >
        Tap the heart on any property and it lands here, so you can compare your shortlist
        side by side.
      </BuyerEmpty>
    );
  }

  return (
    <section aria-label="Saved properties" className="mt-8">
      <h2 className="text-lg font-semibold text-primary">
        {saved.length} saved {saved.length === 1 ? "property" : "properties"}
      </h2>

      <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {saved.map((listing) => (
          <PropertyCard
            key={listing.id}
            listing={listing}
            saveable={user.role === "BUYER"}
            initialSaved
          />
        ))}
      </div>
    </section>
  );
}
