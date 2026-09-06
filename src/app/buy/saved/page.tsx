import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPenceGBP } from "@/services/metrics/globalMetrics";
import { PortalEmpty } from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const session = await auth();
  const user = session?.user;
  if (!user) redirect("/login");
  if (!["BUYER", "ADMIN"].includes(user.role)) redirect("/403");

  // Scoped by `userId` in the `where` — never filtered after the fact.
  const saved = await db.savedProperty.findMany({
    where: { userId: user.id },
    orderBy: { property: { createdAt: "desc" } },
    include: {
      property: { select: { id: true, title: true, city: true, askingPriceGBP: true } },
    },
  });

  if (saved.length === 0) {
    return (
      <PortalEmpty>
        Nothing saved yet. Save a listing from the search and it appears here.
      </PortalEmpty>
    );
  }

  return (
    <ul className="border-t border-line">
      {saved.map((s) => (
        <li
          key={s.propertyId}
          className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-4"
        >
          <Link
            href={`/marketplace/${s.property.id}`}
            className="font-medium text-primary underline decoration-line underline-offset-4 hover:decoration-accent"
          >
            {s.property.title}
          </Link>
          <span className="text-sm text-muted">
            {s.property.city} · {formatPenceGBP(s.property.askingPriceGBP)}
          </span>
        </li>
      ))}
    </ul>
  );
}
