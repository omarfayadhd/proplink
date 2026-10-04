import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BuyerShell } from "@/components/buy/BuyerShell";
import { buyerTabs } from "@/app/buy/nav";
import { getBuyerActivityCounts } from "@/services/buyers/buyerDashboard";

/**
 * The buyer portal's frame (ADR-020). Role gating is `src/middleware.ts`
 * (BUYER/ADMIN) plus each page's own `auth()` check — the `auth()` call here
 * exists to scope the tab counts to the viewer, not to authorise the route.
 */
export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;
  if (!user) redirect("/login");

  const counts = await getBuyerActivityCounts(user.id);

  return <BuyerShell tabs={buyerTabs(counts)}>{children}</BuyerShell>;
}
