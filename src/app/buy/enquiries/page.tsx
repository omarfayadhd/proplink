import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BuyerEmpty } from "@/components/buy/BuyerShell";
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
      <BuyerEmpty
        title="No enquiries sent"
        action={
          <Link
            href="/buy"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent"
          >
            Find a property
          </Link>
        }
      >
        Ask an agent a question from any listing and the conversation is recorded here.
      </BuyerEmpty>
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
