import { PortalShell } from "@/components/portal/PortalShell";
import { INVESTOR_NAV } from "@/app/investor/nav";

/**
 * The investor portal's frame (ADR-016). Role gating is `src/middleware.ts`
 * (INVESTOR/ADMIN) plus the page's own `auth()` check.
 */
export default function InvestorLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      eyebrow="Investor portal"
      title="Your syndicates,"
      titleTail="your position"
      standfirst="Expressions of interest, funding progress and the projects behind them."
      nav={INVESTOR_NAV}
    >
      {children}
    </PortalShell>
  );
}
