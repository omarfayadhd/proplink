import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PortalEmpty } from "@/components/portal/PortalShell";
import { ActivityList, type ActivityItem } from "@/components/buy/ActivityList";

export const dynamic = "force-dynamic";

export default async function EnquiriesPage() {
  const session = await auth();
  const user = session?.user;
  if (!user) redirect("/login");
  if (!["BUYER", "ADMIN"].includes(user.role)) redirect("/403");

  const enquiries = await db.enquiry.findMany({
    where: { fromUserId: user.id },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { id: true, title: true } } },
  });

  if (enquiries.length === 0) {
    return (
      <PortalEmpty>
        No enquiries sent. Contacting an agent from a listing records it here.
      </PortalEmpty>
    );
  }

  const items: ActivityItem[] = enquiries.map((e) => ({
    id: e.id,
    href: `/marketplace/${e.property.id}`,
    title: e.property.title,
    meta: e.createdAt,
    status: e.status,
  }));

  return <ActivityList items={items} />;
}
