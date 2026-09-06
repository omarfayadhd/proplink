import { db } from "@/lib/db";
import type { Enquiry } from "@/generated/prisma/client";
import { EnquiryStatus } from "@/generated/prisma/enums";
import { isPubliclyVisibleStatus } from "@/services/listings/listingService";
import { EnquiryServiceError } from "@/services/enquiries/errors";
import { sendNewEnquiryEmail } from "@/services/email/mailer";
import type { CreateEnquiryInput } from "@/services/enquiries/validation";

const ENQUIRABLE_PROPERTY_INCLUDE = {
  agentProfile: { include: { user: true } },
} as const;

/**
 * Loads the listing this enquiry is about, gated the same way the public
 * `/marketplace/[id]` page is (`getListingForPublicView`'s LIVE/UNDER_OFFER/
 * SOLD rule, reused via `isPubliclyVisibleStatus`) — a DRAFT/PENDING_REVIEW
 * listing 404s here too, not just on the page, so the API can't be used to
 * probe for or message about listings that aren't public yet. `NOT_FOUND`
 * either way (missing vs. not-yet-public) so the response never leaks which
 * case it was.
 */
async function findEnquirableProperty(propertyId: string) {
  const property = await db.property.findUnique({
    where: { id: propertyId },
    include: ENQUIRABLE_PROPERTY_INCLUDE,
  });
  if (!property || !isPubliclyVisibleStatus(property.status)) {
    throw new EnquiryServiceError("Listing not found", "NOT_FOUND");
  }
  return property;
}

/**
 * Creates an `Enquiry` (Task 2.5 brief) and emails the owning agent. `userId`
 * is required — `Enquiry.fromUserId` is a non-null column, so this is only
 * ever called for a logged-in caller (the route enforces that via
 * `requireRole()`); there is no anonymous-enquiry path.
 *
 * `contactPhone` has no dedicated `Enquiry` column (checked
 * `prisma/schema.prisma` first, per the task brief — adding one for a single
 * optional field wasn't worth a migration): when supplied it's prepended to
 * the persisted `message` so it survives for Task 2.6's leads list, and is
 * also passed to the notification email separately for a cleaner subject
 * line/body split.
 */
export async function createEnquiry(params: {
  userId: string;
  propertyId: string;
  message: CreateEnquiryInput["message"];
  contactPhone?: CreateEnquiryInput["contactPhone"];
}): Promise<Enquiry> {
  const property = await findEnquirableProperty(params.propertyId);

  const fromUser = await db.user.findUnique({ where: { id: params.userId } });
  if (!fromUser) {
    throw new EnquiryServiceError("Enquiring user not found", "NOT_FOUND");
  }

  const contactPhone = params.contactPhone?.trim() || null;
  const message = contactPhone
    ? `Contact phone: ${contactPhone}\n\n${params.message}`
    : params.message;

  const enquiry = await db.enquiry.create({
    data: {
      propertyId: params.propertyId,
      fromUserId: params.userId,
      message,
    },
  });

  // Fire-and-forget — same convention as `moderationService.ts`'s
  // approve/reject notifications: a mailer outage must not turn an
  // already-committed enquiry into a 500.
  sendNewEnquiryEmail({
    to: property.agentProfile.user.email,
    listingTitle: property.title,
    fromName: fromUser.name,
    fromEmail: fromUser.email,
    contactPhone,
    message: params.message,
  }).catch((err) => console.error("new-enquiry email failed:", err));

  return enquiry;
}

// ---------------------------------------------------------------------------
// Task 2.6 — agent leads management
// ---------------------------------------------------------------------------

const LEAD_INCLUDE = {
  from: { select: { id: true, name: true, email: true, role: true } },
  property: { select: { id: true, title: true, postcode: true } },
} as const;

export type Lead = Awaited<ReturnType<typeof listEnquiriesForAgentProfile>>[number];

/**
 * The `/agent/leads` table: every enquiry across one agency profile's
 * listings, newest first.
 *
 * Scoped to a single profile (the nav's active one) rather than to every
 * profile the user owns — an agent working as one agency shouldn't see another
 * agency's leads mixed in. Ownership is re-checked here rather than trusted
 * from the caller: the active profile arrives from a cookie, which is a hint,
 * never proof (`src/lib/activeAgentProfile.ts`).
 */
export async function listEnquiriesForAgentProfile(params: {
  agentProfileId: string;
  agentUserId: string;
}) {
  const profile = await db.agentProfile.findUnique({
    where: { id: params.agentProfileId },
  });
  // "Not found" and "not yours" are the same answer, so neither leaks.
  if (!profile || profile.userId !== params.agentUserId) {
    throw new EnquiryServiceError(
      "Agent profile not found, or not owned by this user",
      "FORBIDDEN",
    );
  }

  return db.enquiry.findMany({
    where: { property: { agentProfileId: params.agentProfileId } },
    orderBy: { createdAt: "desc" },
    include: LEAD_INCLUDE,
  });
}

/**
 * Moves a lead through NEW → RESPONDED → CLOSED (any order — an agent may
 * reopen a lead they closed early, and the sprint plan asks only that changes
 * persist, not that they follow a one-way machine like listing status does).
 *
 * Ownership is by the enquiry's listing's agent profile's `userId`: an agent
 * may own several profiles and any of them qualifies, so this is deliberately
 * not scoped to whichever profile is currently active in their nav.
 */
export async function updateEnquiryStatus(params: {
  enquiryId: string;
  agentUserId: string;
  status: EnquiryStatus;
}): Promise<Enquiry> {
  // Defence in depth: the route's Zod enum already covers HTTP callers, but the
  // service is directly callable (server actions, future jobs).
  if (!Object.values(EnquiryStatus).includes(params.status)) {
    throw new EnquiryServiceError(
      `Unknown enquiry status: ${params.status}`,
      "VALIDATION",
    );
  }

  const enquiry = await db.enquiry.findUnique({
    where: { id: params.enquiryId },
    include: { property: { include: { agentProfile: true } } },
  });
  if (!enquiry) {
    throw new EnquiryServiceError("Enquiry not found", "NOT_FOUND");
  }
  if (enquiry.property.agentProfile.userId !== params.agentUserId) {
    throw new EnquiryServiceError("This lead belongs to another agency", "FORBIDDEN");
  }

  return db.enquiry.update({
    where: { id: params.enquiryId },
    data: { status: params.status },
  });
}
