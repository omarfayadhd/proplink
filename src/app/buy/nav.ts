import type { BuyerTabItem } from "@/components/buy/BuyerTabs";
import type { BuyerActivityCounts } from "@/services/buyers/buyerDashboard";

/**
 * The buyer portal's navigation (ADR-017, ADR-020). It is a B2C marketplace, so
 * the search is the home and everything else is the buyer's own activity
 * against it.
 *
 * A function rather than a constant because each tab now carries how much sits
 * behind it, which only the request knows.
 */
export function buyerTabs(counts: BuyerActivityCounts): BuyerTabItem[] {
  return [
    { href: "/buy", label: "Search" },
    { href: "/buy/saved", label: "Saved", count: counts.saved },
    { href: "/buy/enquiries", label: "Enquiries", count: counts.enquiries },
    { href: "/buy/viewings", label: "Viewings", count: counts.viewings },
    { href: "/buy/offers", label: "Offers", count: counts.offers },
    {
      href: "/buy/messages",
      label: "Messages",
      count: counts.unreadMessages,
      alert: counts.unreadMessages > 0,
    },
  ];
}
