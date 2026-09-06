import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listBuyerViewings } from "@/services/viewings/viewingService";
import { PortalEmpty } from "@/components/portal/PortalShell";
import { ActivityList, type ActivityItem } from "@/components/buy/ActivityList";

export const dynamic = "force-dynamic";

const SLOT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function ViewingsPage() {
  const session = await auth();
  const user = session?.user;
  if (!user) redirect("/login");
  if (!["BUYER", "ADMIN"].includes(user.role)) redirect("/403");

  const viewings = await listBuyerViewings(user.id);

  if (viewings.length === 0) {
    return (
      <PortalEmpty>
        No viewings requested. Ask for a slot from any live listing and it appears here
        once the agent has seen it.
      </PortalEmpty>
    );
  }

  const items: ActivityItem[] = viewings.map((v) => ({
    id: v.id,
    href: `/marketplace/${v.property.id}`,
    title: v.property.title,
    meta: SLOT.format(v.slotStart),
    status: v.status,
    detail: v.status === "REQUESTED" ? "Waiting for the agent to confirm" : undefined,
  }));

  return <ActivityList items={items} />;
}
