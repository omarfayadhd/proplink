import { db } from "@/lib/db";
import { ListingServiceError } from "@/services/listings/errors";
import { isPubliclyVisibleStatus } from "@/services/listings/listingService";
import { CARD_IMAGE_LIMIT } from "@/services/search/queryBuilder";
import type { SearchResultItem } from "@/services/search/types";

/**
 * Saved-listings ("watchlist") writes behind the `/marketplace/[id]` save
 * button (Task 2.6). `SavedProperty` is a pure join row keyed on
 * `(userId, propertyId)`, so both operations are written to be idempotent:
 * a double-clicked save is still just "saved", and unsaving something that
 * isn't saved is the desired end state rather than an error.
 *
 * The BUYER/INVESTOR role gate lives in the route (`requireRole`), matching
 * how every other role restriction in this codebase is expressed; what belongs
 * here is the listing-visibility rule, which the route can't sensibly own.
 */
export async function saveListing(params: {
  userId: string;
  propertyId: string;
}): Promise<void> {
  const property = await db.property.findUnique({
    where: { id: params.propertyId },
    select: { id: true, status: true },
  });
  if (!property || !isPubliclyVisibleStatus(property.status)) {
    throw new ListingServiceError("Listing not found", "NOT_FOUND");
  }

  await db.savedProperty.upsert({
    where: {
      userId_propertyId: { userId: params.userId, propertyId: params.propertyId },
    },
    create: { userId: params.userId, propertyId: params.propertyId },
    update: {},
  });
}

/**
 * Deliberately does **not** check visibility: a listing can leave public
 * visibility (back to DRAFT after a Task 2.3 rejection) while someone still
 * has it saved, and they must always be able to remove it.
 */
export async function unsaveListing(params: {
  userId: string;
  propertyId: string;
}): Promise<void> {
  await db.savedProperty.deleteMany({
    where: { userId: params.userId, propertyId: params.propertyId },
  });
}

export async function isListingSavedBy(params: {
  userId: string;
  propertyId: string;
}): Promise<boolean> {
  const row = await db.savedProperty.findUnique({
    where: {
      userId_propertyId: { userId: params.userId, propertyId: params.propertyId },
    },
  });
  return row !== null;
}

/**
 * Which of `propertyIds` this user has saved — one query for a whole results
 * page, so the grid can render its hearts in their correct state without an
 * `isListingSavedBy` call per card.
 *
 * Returns a Set because every caller asks "is this one in it?" once per card.
 * An empty `propertyIds` short-circuits: `IN ()` is a query with a known answer.
 */
export async function savedPropertyIdsFor(params: {
  userId: string;
  propertyIds: string[];
}): Promise<Set<string>> {
  if (params.propertyIds.length === 0) return new Set();

  const rows = await db.savedProperty.findMany({
    where: { userId: params.userId, propertyId: { in: params.propertyIds } },
    select: { propertyId: true },
  });
  return new Set(rows.map((r) => r.propertyId));
}

/**
 * The viewer's shortlist, shaped as result cards (ADR-020).
 *
 * The saved page used to be a line of text per property. Once the search grid
 * grew a save heart, that was the wrong payoff: a shortlist is for *comparing*,
 * and comparing needs the photo, the price and the defects side by side — the
 * same card the buyer saved it from.
 *
 * Returns `SearchResultItem` rather than a shape of its own so `<PropertyCard>`
 * stays one component with one contract. `lat`/`lng` are null because the card
 * does not read them and `location` is an `Unsupported` PostGIS column that
 * Prisma cannot select; a saved-properties map would need the raw query the
 * search service already has.
 */
export async function listSavedForCards(userId: string): Promise<SearchResultItem[]> {
  const rows = await db.savedProperty.findMany({
    where: { userId },
    orderBy: { property: { createdAt: "desc" } },
    include: {
      property: {
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: CARD_IMAGE_LIMIT },
          distressTags: { orderBy: { tag: "asc" } },
        },
      },
    },
  });

  return rows.map(({ property: p }) => ({
    id: p.id,
    title: p.title,
    city: p.city,
    region: p.region,
    postcode: p.postcode,
    propertyType: p.propertyType,
    bedrooms: p.bedrooms,
    askingPriceGBP: p.askingPriceGBP,
    targetRoiPct: p.targetRoiPct,
    epcRating: p.epcRating,
    status: p.status,
    publishedAt: p.publishedAt,
    imageUrl: p.images[0]?.url ?? null,
    imageUrls: p.images.map((i) => i.url),
    distressTags: p.distressTags.map((t) => t.tag),
    lat: null,
    lng: null,
  }));
}
