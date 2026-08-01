import { PropertyStatus, Role } from "@/generated/prisma/enums";
import { ListingServiceError } from "@/services/listings/errors";

/**
 * Listing status machine (sprint plan, Task 2.2): linear lifecycle,
 * DRAFT -> PENDING_REVIEW -> LIVE -> UNDER_OFFER -> SOLD. No transition may
 * skip a step or move backwards; SOLD is terminal. Each edge names the
 * role(s) allowed to drive it — agents own everything except the
 * PENDING_REVIEW -> LIVE approval, which is admin-only (AGENTS.md non-
 * negotiable: only admin approves a listing to LIVE).
 *
 * One deliberate exception to "no backwards moves": PENDING_REVIEW -> DRAFT,
 * admin-only, is the moderation *reject* path (Task 2.3 sprint-plan
 * acceptance: "reject -> back to DRAFT with reason") — sends a submitted
 * listing back to the agent with `Property.rejectionReason` set so they can
 * fix it up and resubmit.
 */
const LISTING_STATUS_TRANSITIONS: Record<
  PropertyStatus,
  Partial<Record<PropertyStatus, Role[]>>
> = {
  [PropertyStatus.DRAFT]: {
    [PropertyStatus.PENDING_REVIEW]: [Role.AGENT, Role.ADMIN],
  },
  [PropertyStatus.PENDING_REVIEW]: {
    [PropertyStatus.LIVE]: [Role.ADMIN],
    [PropertyStatus.DRAFT]: [Role.ADMIN],
  },
  [PropertyStatus.LIVE]: {
    [PropertyStatus.UNDER_OFFER]: [Role.AGENT, Role.ADMIN],
  },
  [PropertyStatus.UNDER_OFFER]: {
    [PropertyStatus.SOLD]: [Role.AGENT, Role.ADMIN],
  },
  [PropertyStatus.SOLD]: {},
};

export function canTransitionListingStatus(
  from: PropertyStatus,
  to: PropertyStatus,
  role: Role,
): boolean {
  const allowedRoles = LISTING_STATUS_TRANSITIONS[from]?.[to];
  return !!allowedRoles && allowedRoles.includes(role);
}

/** Throws `ListingServiceError` (code `TRANSITION_INVALID`) for an illegal transition. */
export function assertListingTransition(
  from: PropertyStatus,
  to: PropertyStatus,
  role: Role,
): void {
  if (!canTransitionListingStatus(from, to, role)) {
    throw new ListingServiceError(
      `Cannot move a listing from ${from} to ${to} as ${role}`,
      "TRANSITION_INVALID",
    );
  }
}
