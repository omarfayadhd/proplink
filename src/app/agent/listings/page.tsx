import Link from "next/link";
import { auth } from "@/lib/auth";
import { listListingsForAgentUser } from "@/services/listings/listingService";
import { formatPenceGBP } from "@/services/metrics/globalMetrics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { PropertyStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Agent — Listings" };

const STATUS_TONE: Record<
  PropertyStatus,
  "default" | "success" | "warning" | "danger" | "intel"
> = {
  DRAFT: "default",
  PENDING_REVIEW: "warning",
  LIVE: "success",
  UNDER_OFFER: "intel",
  SOLD: "success",
};

export default async function AgentListingsPage() {
  const session = await auth();
  const listings = session?.user ? await listListingsForAgentUser(session.user.id) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {listings.length} listing{listings.length === 1 ? "" : "s"}
        </p>
        <Link href="/agent/listings/new">
          <Button type="button">New listing</Button>
        </Link>
      </div>

      <DataTable
        rows={listings}
        rowKey={(p) => p.id}
        emptyMessage="No listings yet — create your first one."
        columns={[
          {
            key: "title",
            header: "Listing",
            render: (p) => (
              <div>
                <div className="font-medium text-body">{p.title}</div>
                <div className="text-xs text-muted">
                  {p.city}, {p.postcode}
                </div>
                {p.status === "DRAFT" && p.rejectionReason && (
                  <div className="mt-1 text-xs font-medium text-danger">
                    Rejected: {p.rejectionReason}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (p) => <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>,
          },
          {
            key: "price",
            header: "Asking price",
            render: (p) => formatPenceGBP(p.askingPriceGBP),
          },
          // Task 2.6 analytics. `viewCount` is a denormalised counter on
          // Property (incremented once per session by the view beacon); saves
          // are counted live from the `SavedProperty` join rows.
          {
            key: "views",
            header: "Views",
            render: (p) => <span data-testid={`views-${p.id}`}>{p.viewCount}</span>,
          },
          {
            key: "saves",
            header: "Saves",
            render: (p) => <span data-testid={`saves-${p.id}`}>{p._count.savedBy}</span>,
          },
          {
            key: "created",
            header: "Created",
            render: (p) => p.createdAt.toISOString().slice(0, 10),
          },
          {
            key: "actions",
            header: "",
            render: (p) =>
              p.status === "DRAFT" ? (
                <Link
                  href={`/agent/listings/${p.id}/edit`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Edit
                </Link>
              ) : (
                <span className="text-xs text-muted">View only</span>
              ),
          },
        ]}
      />
    </div>
  );
}
