import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { PropertyStatus, Role } from "@/generated/prisma/enums";
import { ListingServiceError } from "@/services/listings/errors";
import { transitionStatus } from "@/services/listings/listingService";
import { writeAudit } from "@/services/admin/audit";
import {
  sendListingApprovedEmail,
  sendListingRejectedEmail,
} from "@/services/email/mailer";

// Distinct from `listingService.ts`'s `LISTING_INCLUDE`: the admin queue also
// needs the agent's name/email (to notify them) and doesn't filter by
// ownership — any PENDING_REVIEW listing is fair game for any admin.
const MODERATION_LISTING_INCLUDE = {
  agentProfile: { include: { user: true } },
  distressTags: true,
  images: { orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.PropertyInclude;

export type ModerationListing = Prisma.PropertyGetPayload<{
  include: typeof MODERATION_LISTING_INCLUDE;
}>;

/** `/admin/moderation` queue — oldest submission first. */
export async function listPendingListings(): Promise<ModerationListing[]> {
  return db.property.findMany({
    where: { status: PropertyStatus.PENDING_REVIEW },
    include: MODERATION_LISTING_INCLUDE,
    orderBy: { submittedAt: "asc" },
  });
}

/** Full-preview fetch for one listing — used by approve/reject to build the notification email. */
export async function getListingForModeration(
  propertyId: string,
): Promise<ModerationListing> {
  const listing = await db.property.findUnique({
    where: { id: propertyId },
    include: MODERATION_LISTING_INCLUDE,
  });
  if (!listing) throw new ListingServiceError("Listing not found", "NOT_FOUND");
  return listing;
}

/**
 * Admin approves a PENDING_REVIEW listing: LIVE + `publishedAt` (via
 * `transitionStatus`, which also re-asserts `assertWithinListingLimit` —
 * AGENTS.md non-negotiable: the free-tier cap of 3 live listings applies at
 * the moment a listing actually goes live), clears any stale
 * `rejectionReason` from an earlier reject cycle, writes an AuditLog row, and
 * notifies the agent. The email is fire-and-forget (same convention as
 * `requestEmailVerification` in registration) — a Resend outage must not turn
 * an already-committed approval into a 500.
 */
export async function approveListing(params: {
  listingId: string;
  adminUserId: string;
}): Promise<Prisma.PropertyGetPayload<Record<string, never>>> {
  const listing = await getListingForModeration(params.listingId);

  const updated = await transitionStatus({
    actorUserId: params.adminUserId,
    actorRole: Role.ADMIN,
    propertyId: params.listingId,
    to: PropertyStatus.LIVE,
    extraData: { rejectionReason: null },
  });

  await writeAudit({
    actorUserId: params.adminUserId,
    action: "LISTING_APPROVED",
    entity: "Property",
    entityId: params.listingId,
    meta: { title: listing.title },
  });

  sendListingApprovedEmail(listing.agentProfile.user.email, listing.title).catch((err) =>
    console.error("listing-approved email failed:", err),
  );

  return updated;
}

/**
 * Admin rejects a PENDING_REVIEW listing back to DRAFT with a reason.
 * `reason` is validated here (not just at the route's Zod boundary) because
 * this is a business rule, not merely a request-shape check — AGENTS.md:
 * business logic lives in services. Reuses `transitionStatus` for the
 * status-machine + role gate (PENDING_REVIEW -> DRAFT is the admin-only
 * exception added to the status machine for this task, see
 * `statusMachine.ts`); `rejectionReason` is written in the same call via
 * `extraData` so the status change and the reason land in a single UPDATE.
 */
export async function rejectListing(params: {
  listingId: string;
  adminUserId: string;
  reason: string;
}): Promise<Prisma.PropertyGetPayload<Record<string, never>>> {
  const reason = params.reason.trim();
  if (!reason) {
    throw new ListingServiceError("A rejection reason is required", "VALIDATION");
  }

  const listing = await getListingForModeration(params.listingId);

  const updated = await transitionStatus({
    actorUserId: params.adminUserId,
    actorRole: Role.ADMIN,
    propertyId: params.listingId,
    to: PropertyStatus.DRAFT,
    extraData: { rejectionReason: reason },
  });

  await writeAudit({
    actorUserId: params.adminUserId,
    action: "LISTING_REJECTED",
    entity: "Property",
    entityId: params.listingId,
    meta: { title: listing.title, reason },
  });

  sendListingRejectedEmail(listing.agentProfile.user.email, listing.title, reason).catch(
    (err) => console.error("listing-rejected email failed:", err),
  );

  return updated;
}
