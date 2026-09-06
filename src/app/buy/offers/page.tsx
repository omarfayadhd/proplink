import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { formatPenceGBP } from "@/services/metrics/globalMetrics";
import { listBuyerOffers } from "@/services/offers/offerService";
import { PortalEmpty } from "@/components/portal/PortalShell";
import { DealTracker } from "@/components/buy/DealTracker";
import { ActivityList, type ActivityItem } from "@/components/buy/ActivityList";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const session = await auth();
  const user = session?.user;
  if (!user) redirect("/login");
  if (!["BUYER", "ADMIN"].includes(user.role)) redirect("/403");

  const offers = await listBuyerOffers(user.id);

  if (offers.length === 0) {
    return (
      <PortalEmpty>
        No offers submitted. Make an offer from a live listing and track it here.
      </PortalEmpty>
    );
  }

  // An accepted offer has a deal behind it, and the deal is the thing the buyer
  // actually wants to watch — so it gets its own stepper above the list.
  const live = offers.filter((o) => o.deals.length > 0);

  const items: ActivityItem[] = offers.map((o) => ({
    id: o.id,
    href: `/marketplace/${o.property.id}`,
    title: o.property.title,
    meta: formatPenceGBP(o.amountGBP),
    status: o.status,
    detail: `Asking ${formatPenceGBP(o.property.askingPriceGBP)}`,
  }));

  return (
    <>
      {live.map((o) => (
        <div key={o.id} className="mb-10">
          <h2 className="text-lg font-semibold text-primary">{o.property.title}</h2>
          <DealTracker stage={o.deals[0].stage} />
        </div>
      ))}
      <ActivityList items={items} />
    </>
  );
}
