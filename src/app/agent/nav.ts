import type { PortalNavItem } from "@/components/portal/PortalShell";

/**
 * The agent portal's navigation, in one place because the global header carries
 * none (ADR-009) — a page missing from this list is unreachable.
 */
export const AGENT_NAV: PortalNavItem[] = [
  { href: "/agent", label: "Dashboard" },
  { href: "/agent/listings", label: "Listings" },
  { href: "/agent/leads", label: "Leads" },
  { href: "/agent/profile", label: "Profile" },
];
