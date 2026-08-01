"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, EpcBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { DISTRESS_TAG_OPTIONS, formatPenceGBP } from "@/components/listings/wizardTypes";
import type { DistressTag, EpcRating, PropertyType } from "@/generated/prisma/enums";

export interface ModerationListingView {
  id: string;
  title: string;
  description: string;
  addressLine1: string;
  city: string;
  region: string;
  postcode: string;
  propertyType: PropertyType;
  bedrooms: number;
  askingPriceGBP: number;
  targetRoiPct: number | null;
  epcRating: EpcRating | null;
  epcCertUrl: string | null;
  floorPlanUrl: string | null;
  distressTags: DistressTag[];
  images: { url: string; sortOrder: number }[];
  /** ISO date string — set the moment the listing was (re)submitted for review. */
  submittedAt: string | null;
  createdAt: string;
  agencyName: string;
  agentEmail: string;
}

async function parseErrorMessage(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  if (data?.issues) {
    const first = Object.values(data.issues as Record<string, string[]>).flat()[0];
    if (first) return String(first);
  }
  return data?.error ?? `Request failed (${res.status})`;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-body">{value || "—"}</dd>
    </div>
  );
}

export function ModerationQueue({ listings }: { listings: ModerationListingView[] }) {
  const router = useRouter();
  const toast = useToast();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const reviewing = listings.find((l) => l.id === reviewingId) ?? null;

  function openReview(id: string) {
    setReviewingId(id);
    setReason("");
  }

  function closeReview() {
    setReviewingId(null);
    setReason("");
  }

  async function approve(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/listings/${id}/approve`, { method: "POST" });
      if (!res.ok) {
        toast(await parseErrorMessage(res), "danger");
        return;
      }
      toast("Listing approved — now live", "success");
      closeReview();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function reject(id: string) {
    if (!reason.trim()) {
      toast("Enter a reason before rejecting", "danger");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/listings/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        toast(await parseErrorMessage(res), "danger");
        return;
      }
      toast("Listing rejected — sent back to the agent", "success");
      closeReview();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {listings.length} listing{listings.length === 1 ? "" : "s"} awaiting review
      </p>

      <DataTable
        rows={listings}
        rowKey={(l) => l.id}
        emptyMessage="No listings are waiting for review."
        columns={[
          {
            key: "title",
            header: "Listing",
            render: (l) => (
              <div>
                <div className="font-medium text-body">{l.title}</div>
                <div className="text-xs text-muted">
                  {l.city}, {l.postcode}
                </div>
              </div>
            ),
          },
          { key: "agent", header: "Agent", render: (l) => l.agencyName },
          {
            key: "price",
            header: "Asking price",
            render: (l) => formatPenceGBP(l.askingPriceGBP),
          },
          {
            key: "submitted",
            header: "Submitted",
            render: (l) => (l.submittedAt ?? l.createdAt).slice(0, 10),
          },
          {
            key: "actions",
            header: "",
            render: (l) => (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => openReview(l.id)}
              >
                Review
              </Button>
            ),
          },
        ]}
      />

      <Modal
        open={reviewing != null}
        onClose={closeReview}
        title={reviewing?.title ?? "Review listing"}
        className="max-w-2xl"
      >
        {reviewing && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <EpcBadge rating={reviewing.epcRating} />
              <Badge>{reviewing.propertyType}</Badge>
              <span className="text-sm text-muted">
                {reviewing.agencyName} &middot; {reviewing.agentEmail}
              </span>
            </div>

            {reviewing.images.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {reviewing.images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.url}
                    src={img.url}
                    alt=""
                    className="h-20 w-full rounded object-cover"
                  />
                ))}
              </div>
            )}

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Address"
                value={`${reviewing.addressLine1}, ${reviewing.city}, ${reviewing.region}, ${reviewing.postcode}`}
              />
              <Field label="Bedrooms" value={reviewing.bedrooms} />
              <Field
                label="Asking price"
                value={formatPenceGBP(reviewing.askingPriceGBP)}
              />
              <Field
                label="Target ROI"
                value={
                  reviewing.targetRoiPct != null ? `${reviewing.targetRoiPct}%` : null
                }
              />
              <Field
                label="EPC certificate"
                value={
                  reviewing.epcCertUrl ? (
                    <a
                      className="text-accent underline"
                      href={reviewing.epcCertUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View certificate
                    </a>
                  ) : null
                }
              />
              <Field
                label="Floor plan"
                value={
                  reviewing.floorPlanUrl ? (
                    <a
                      className="text-accent underline"
                      href={reviewing.floorPlanUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View floor plan
                    </a>
                  ) : null
                }
              />
            </dl>

            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                Distress tags
              </dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {reviewing.distressTags.length > 0 ? (
                  reviewing.distressTags.map((tag) => (
                    <Badge key={tag} tone="warning">
                      {DISTRESS_TAG_OPTIONS.find((o) => o.value === tag)?.label ?? tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-body">—</span>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                Description
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-body">
                {reviewing.description}
              </dd>
            </div>

            <div className="flex flex-col gap-4 border-t border-line pt-4 sm:flex-row sm:items-end sm:justify-between">
              <Button type="button" onClick={() => approve(reviewing.id)} disabled={busy}>
                Approve
              </Button>

              <div className="min-w-[240px] flex-1 space-y-2">
                <label
                  htmlFor="reject-reason"
                  className="block text-xs font-medium text-muted"
                >
                  Rejection reason (required)
                </label>
                <textarea
                  id="reject-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  placeholder="e.g. Missing EPC certificate"
                />
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={busy || !reason.trim()}
                  onClick={() => reject(reviewing.id)}
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
