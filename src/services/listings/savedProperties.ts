import { db } from "@/lib/db";
import { ListingServiceError } from "@/services/listings/errors";
import { isPubliclyVisibleStatus } from "@/services/listings/listingService";

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
