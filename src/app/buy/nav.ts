import type { PortalNavItem } from "@/components/portal/PortalShell";

/**
 * The buyer portal's navigation (ADR-017). It is a B2C marketplace, so the
 * search is the home and everything else is the buyer's own activity against it.
 */
export const BUYER_NAV: PortalNavItem[] = [
  { href: "/buy", label: "Search" },
  { href: "/buy/saved", label: "Saved" },
  { href: "/buy/enquiries", label: "Enquiries" },
  { href: "/buy/viewings", label: "Viewings" },
  { href: "/buy/offers", label: "Offers" },
  { href: "/buy/messages", label: "Messages" },
];
