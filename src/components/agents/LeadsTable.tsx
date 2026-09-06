"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

export interface LeadRow {
  id: string;
  message: string;
  status: string;
  createdAt: string;
  fromName: string;
  fromEmail: string;
  propertyId: string;
  propertyTitle: string;
}

const STATUS_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "RESPONDED", label: "Responded" },
  { value: "CLOSED", label: "Closed" },
];

const STATUS_TONE: Record<string, "warning" | "success" | "default"> = {
  NEW: "warning",
  RESPONDED: "success",
  CLOSED: "default",
};

/**
 * `/agent/leads` table (Task 2.6). Status is a per-row `<select>` that PATCHes
 * `/api/enquiries/[id]` and then `router.refresh()`es, the same
 * fetch-then-refresh pattern as `ListingWizard` and `ModerationQueue` — the
 * server component re-runs and the row re-renders from the DB, so what you see
 * after the toast is persisted state rather than local optimism.
 *
 * The select is disabled while its own request is in flight (tracked per row,
 * not globally, so two leads can be updated back to back).
 */
export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function changeStatus(id: string, status: string) {
    setPendingId(id);
    try {
      const res = await fetch(`/api/enquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error ?? `Could not update the lead (${res.status})`, "danger");
        return;
      }
      toast("Lead status updated", "success");
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <DataTable
      rows={leads}
      rowKey={(l) => l.id}
      emptyMessage="No enquiries yet for this agency."
      columns={[
        {
          key: "from",
          header: "Enquirer",
          render: (l) => (
            <div>
              <div className="font-medium text-body">{l.fromName}</div>
              <a
                href={`mailto:${l.fromEmail}`}
                className="text-xs text-accent hover:underline"
              >
                {l.fromEmail}
              </a>
            </div>
          ),
        },
        {
          key: "listing",
          header: "Listing",
          render: (l) => (
            <Link
              href={`/marketplace/${l.propertyId}`}
              className="text-sm text-accent hover:underline"
            >
              {l.propertyTitle}
            </Link>
          ),
        },
        {
          key: "message",
          header: "Message",
          render: (l) => (
            <p className="max-w-md whitespace-pre-wrap text-sm text-body">{l.message}</p>
          ),
        },
        {
          key: "created",
          header: "Received",
          render: (l) => (
            <span className="text-xs text-muted">{l.createdAt.slice(0, 10)}</span>
          ),
        },
        {
          key: "status",
          header: "Status",
          render: (l) => (
            <div className="flex items-center gap-2">
              <Badge tone={STATUS_TONE[l.status] ?? "default"}>{l.status}</Badge>
              <Select
                aria-label={`Status for ${l.fromName}'s enquiry`}
                options={STATUS_OPTIONS}
                value={l.status}
                disabled={pendingId === l.id}
                onChange={(e) => changeStatus(l.id, e.target.value)}
                className="mt-0 w-36"
              />
            </div>
          ),
        },
      ]}
    />
  );
}
