import type { PortalNavItem } from "@/components/portal/PortalShell";

/**
 * The investor portal's navigation. Only the dashboard exists today — the
 * syndicate discovery and pledge flows are Sprint 4 (Task 4.2), and listing a
 * link to a route that 404s is worse than not listing it.
 */
export const INVESTOR_NAV: PortalNavItem[] = [{ href: "/investor", label: "Dashboard" }];
