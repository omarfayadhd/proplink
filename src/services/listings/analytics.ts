import { db } from "@/lib/db";
import { EnquiryStatus, Role } from "@/generated/prisma/enums";
import { ListingServiceError } from "@/services/listings/errors";
import { isPubliclyVisibleStatus } from "@/services/listings/listingService";

/**
 * Session-scoped list of listing ids this browser has already been counted
 * for. httpOnly and **no `maxAge`**, so it is a true session cookie: it dies
 * with the browser session, which is exactly the dedupe window the Task 2.6
 * brief asks for ("increments once per session").
 *
 * A cookie rather than a Redis set keyed by session id, for two reasons: it
 * works for anonymous visitors (who have no session id at all), and Upstash is
 * still unresolved (H1.5) so a Redis-backed counter would silently no-op
 * locally — the graceful-fallback path would _be_ the only path.
 */
export const VIEWED_LISTINGS_COOKIE = "proplink_viewed_listings";

/**
 * Browsers cap a single cookie at ~4KB. cuids are 25 chars, so 50 ids plus
 * separators is ~1.3KB — comfortably inside the cap, while still covering far
 * more listings than one session would realistically visit. Past that the
 * oldest entries are dropped (they would be re-counted if revisited, which is
 * a better failure than a truncated cookie corrupting every id in it).
 */
export const MAX_TRACKED_VIEWS = 50;

export function parseViewedListings(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}

export function serialiseViewedListings(ids: string[]): string {
  return ids.slice(-MAX_TRACKED_VIEWS).join(",");
}

/**
 * The dedupe + self-view rules, kept pure so they are testable without a DB or
 * Next's request-scoped cookie API.
 *
 * A different agent's view *does* count — they are a genuine visitor. Only the
 * listing's own agent and admins are excluded, so an agent can't inflate their
 * own numbers by refreshing and moderation traffic doesn't pollute them.
 */
export function shouldCountListingView(params: {
  propertyId: string;
  viewedIds: string[];
  viewer: { userId: string; role: Role } | null;
  ownerUserId: string;
}): boolean {
  if (params.viewedIds.includes(params.propertyId)) return false;
  if (!params.viewer) return true;
  if (params.viewer.role === Role.ADMIN) return false;
  return params.viewer.userId !== params.ownerUserId;
}

/**
 * Records a view of the public detail page. Returns the (possibly unchanged)
 * session list so the caller — `POST /api/listings/[id]/view`, the only place
 * that can legitimately set a cookie — can write it back.
 *
 * `counted: false` covers both "already seen this session" and "this viewer's
 * views don't count"; the caller does not need to distinguish them.
 */
export async function recordListingView(params: {
  propertyId: string;
  viewer: { userId: string; role: Role } | null;
  viewedIds: string[];
}): Promise<{ counted: boolean; viewedIds: string[] }> {
  const property = await db.property.findUnique({
    where: { id: params.propertyId },
    select: { id: true, status: true, agentProfile: { select: { userId: true } } },
  });
  // Same 404-not-403 rule as the page and the enquiry service: a non-public
  // listing is only reachable by its owner or an admin, neither of whom counts.
  if (!property || !isPubliclyVisibleStatus(property.status)) {
    throw new ListingServiceError("Listing not found", "NOT_FOUND");
  }

  const counted = shouldCountListingView({
    propertyId: params.propertyId,
    viewedIds: params.viewedIds,
    viewer: params.viewer,
    ownerUserId: property.agentProfile.userId,
  });
  if (!counted) return { counted: false, viewedIds: params.viewedIds };

  await db.property.update({
    where: { id: params.propertyId },
    data: { viewCount: { increment: 1 } },
  });

  return { counted: true, viewedIds: [...params.viewedIds, params.propertyId] };
}

/** Headline numbers for the `/agent/leads` analytics strip, per agency profile. */
export async function getAgentProfileAnalytics(agentProfileId: string): Promise<{
  listings: number;
  views: number;
  saves: number;
  leads: number;
  newLeads: number;
}> {
  const listingScope = { property: { agentProfileId } };

  const [listings, viewAggregate, saves, leads, newLeads] = await Promise.all([
    db.property.count({ where: { agentProfileId } }),
    db.property.aggregate({ where: { agentProfileId }, _sum: { viewCount: true } }),
    db.savedProperty.count({ where: listingScope }),
    db.enquiry.count({ where: listingScope }),
    db.enquiry.count({ where: { ...listingScope, status: EnquiryStatus.NEW } }),
  ]);

  return {
    listings,
    // `_sum` is null, not 0, when the profile has no listings at all.
    views: viewAggregate._sum.viewCount ?? 0,
    saves,
    leads,
    newLeads,
  };
}
