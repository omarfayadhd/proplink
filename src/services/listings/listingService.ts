import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { PropertyStatus, Role } from "@/generated/prisma/enums";
import { assertListingTransition } from "@/services/listings/statusMachine";
import { ListingServiceError } from "@/services/listings/errors";
import {
  assertReadyForSubmission,
  type CreateListingInput,
  type UpdateListingInput,
} from "@/services/listings/validation";
import { geocodePostcode } from "@/services/maps";

const FREE_TIER_LISTING_LIMIT = 3;

const LISTING_INCLUDE = {
  agentProfile: true,
  distressTags: true,
  images: { orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.PropertyInclude;

type ListingWithRelations = Prisma.PropertyGetPayload<{
  include: typeof LISTING_INCLUDE;
}>;

async function findOwnedAgentProfile(userId: string, agentProfileId: string) {
  const profile = await db.agentProfile.findUnique({ where: { id: agentProfileId } });
  if (!profile || profile.userId !== userId) {
    throw new ListingServiceError(
      "Agent profile not found, or not owned by this user",
      "FORBIDDEN",
    );
  }
  return profile;
}

async function findOwnedListing(
  userId: string,
  propertyId: string,
): Promise<ListingWithRelations> {
  const property = await db.property.findUnique({
    where: { id: propertyId },
    include: LISTING_INCLUDE,
  });
  if (!property) throw new ListingServiceError("Listing not found", "NOT_FOUND");
  if (property.agentProfile.userId !== userId) {
    throw new ListingServiceError("You do not own this listing", "FORBIDDEN");
  }
  return property;
}

/** Reusable by Task 2.3's admin route/UI (loads any listing, no ownership check). */
export async function getListingById(
  propertyId: string,
): Promise<ListingWithRelations | null> {
  return db.property.findUnique({ where: { id: propertyId }, include: LISTING_INCLUDE });
}

export async function getOwnedListing(params: {
  userId: string;
  propertyId: string;
}): Promise<ListingWithRelations> {
  return findOwnedListing(params.userId, params.propertyId);
}

export async function listActiveAgentProfiles(userId: string) {
  return db.agentProfile.findMany({
    where: { userId, active: true },
    orderBy: { agencyName: "asc" },
  });
}

export async function listListingsForAgentUser(agentUserId: string) {
  return db.property.findMany({
    where: { agentProfile: { userId: agentUserId } },
    orderBy: { createdAt: "desc" },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
}

export async function countLiveListings(agentUserId: string): Promise<number> {
  return db.property.count({
    where: { status: PropertyStatus.LIVE, agentProfile: { userId: agentUserId } },
  });
}

/** Default free tier (3 live listings) applies when the agent has no Subscription row yet. */
export async function assertWithinListingLimit(agentUserId: string): Promise<void> {
  const subscription = await db.subscription.findUnique({ where: { agentUserId } });
  const limit = subscription?.listingLimit ?? FREE_TIER_LISTING_LIMIT;
  const current = await countLiveListings(agentUserId);
  if (current >= limit) {
    throw new ListingServiceError(
      `Listing limit reached — your plan allows ${limit} live listing${limit === 1 ? "" : "s"} at a time.`,
      "LIMIT_EXCEEDED",
    );
  }
}

/** PostGIS point is Prisma `Unsupported` — set via raw SQL (AGENTS.md / ARCHITECTURE.md). */
async function setPropertyLocation(
  propertyId: string,
  lat: number,
  lng: number,
): Promise<void> {
  await db.$executeRaw`
    UPDATE "Property"
    SET "location" = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
    WHERE "id" = ${propertyId}
  `;
}

async function writeDistressTags(propertyId: string, tags: string[]): Promise<void> {
  await db.$transaction([
    db.propertyDistressTag.deleteMany({ where: { propertyId } }),
    ...(tags.length > 0
      ? [
          db.propertyDistressTag.createMany({
            data: tags.map((tag) => ({ propertyId, tag: tag as never })),
          }),
        ]
      : []),
  ]);
}

async function writeImages(
  propertyId: string,
  images: { url: string; sortOrder: number }[],
): Promise<void> {
  await db.$transaction([
    db.propertyImage.deleteMany({ where: { propertyId } }),
    ...(images.length > 0
      ? [
          db.propertyImage.createMany({
            data: images.map((img) => ({ propertyId, ...img })),
          }),
        ]
      : []),
  ]);
}

export async function createDraft(params: {
  userId: string;
  input: CreateListingInput;
}): Promise<ListingWithRelations> {
  const { userId, input } = params;
  await findOwnedAgentProfile(userId, input.agentProfileId);

  const property = await db.property.create({
    data: {
      agentProfileId: input.agentProfileId,
      title: input.title,
      description: input.description,
      addressLine1: input.addressLine1,
      city: input.city,
      region: input.region,
      postcode: input.postcode,
      propertyType: input.propertyType,
      bedrooms: input.bedrooms,
      askingPriceGBP: input.askingPriceGBP,
      targetRoiPct: input.targetRoiPct ?? null,
      epcRating: input.epcRating ?? null,
      epcCertUrl: input.epcCertUrl ?? null,
      floorPlanUrl: input.floorPlanUrl ?? null,
      pricingSafeguardAckAt: input.pricingSafeguardAck ? new Date() : null,
      status: PropertyStatus.DRAFT,
    },
  });

  await writeDistressTags(property.id, input.distressTags);
  await writeImages(property.id, input.images);

  const geo = await geocodePostcode(input.postcode);
  await setPropertyLocation(property.id, geo.lat, geo.lng);

  return findOwnedListing(userId, property.id);
}

export async function updateDraft(params: {
  userId: string;
  propertyId: string;
  input: UpdateListingInput;
}): Promise<ListingWithRelations> {
  const { userId, propertyId, input } = params;
  const existing = await findOwnedListing(userId, propertyId);

  if (existing.status !== PropertyStatus.DRAFT) {
    throw new ListingServiceError(
      `Only DRAFT listings can be edited — this listing is already ${existing.status}`,
      "TRANSITION_INVALID",
    );
  }

  const data: Prisma.PropertyUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.addressLine1 !== undefined) data.addressLine1 = input.addressLine1;
  if (input.city !== undefined) data.city = input.city;
  if (input.region !== undefined) data.region = input.region;
  if (input.postcode !== undefined) data.postcode = input.postcode;
  if (input.propertyType !== undefined) data.propertyType = input.propertyType;
  if (input.bedrooms !== undefined) data.bedrooms = input.bedrooms;
  if (input.askingPriceGBP !== undefined) data.askingPriceGBP = input.askingPriceGBP;
  if (input.targetRoiPct !== undefined) data.targetRoiPct = input.targetRoiPct;
  if (input.epcRating !== undefined) data.epcRating = input.epcRating;
  if (input.epcCertUrl !== undefined) data.epcCertUrl = input.epcCertUrl;
  if (input.floorPlanUrl !== undefined) data.floorPlanUrl = input.floorPlanUrl;
  if (input.pricingSafeguardAck !== undefined) {
    data.pricingSafeguardAckAt = input.pricingSafeguardAck ? new Date() : null;
  }

  if (Object.keys(data).length > 0) {
    await db.property.update({ where: { id: propertyId }, data });
  }

  if (input.distressTags !== undefined)
    await writeDistressTags(propertyId, input.distressTags);
  if (input.images !== undefined) await writeImages(propertyId, input.images);

  if (input.postcode !== undefined && input.postcode !== existing.postcode) {
    const geo = await geocodePostcode(input.postcode);
    await setPropertyLocation(propertyId, geo.lat, geo.lng);
  }

  return findOwnedListing(userId, propertyId);
}

export async function submitForReview(params: { userId: string; propertyId: string }) {
  const property = await findOwnedListing(params.userId, params.propertyId);

  assertReadyForSubmission({
    distressTags: property.distressTags,
    pricingSafeguardAckAt: property.pricingSafeguardAckAt,
    epcRating: property.epcRating,
  });

  return transitionStatus({
    actorUserId: params.userId,
    actorRole: Role.AGENT,
    propertyId: property.id,
    to: PropertyStatus.PENDING_REVIEW,
  });
}

/**
 * Generic status-machine gate, reused by Task 2.3's admin approve/reject
 * route. Agents must own the listing; admins may act on any listing.
 * Approving to LIVE additionally enforces `Subscription.listingLimit`.
 */
export async function transitionStatus(params: {
  actorUserId: string;
  actorRole: Role;
  propertyId: string;
  to: PropertyStatus;
}): Promise<Prisma.PropertyGetPayload<Record<string, never>>> {
  const property = await db.property.findUnique({
    where: { id: params.propertyId },
    include: { agentProfile: true },
  });
  if (!property) throw new ListingServiceError("Listing not found", "NOT_FOUND");

  if (
    params.actorRole !== Role.ADMIN &&
    property.agentProfile.userId !== params.actorUserId
  ) {
    throw new ListingServiceError("You do not own this listing", "FORBIDDEN");
  }

  assertListingTransition(property.status, params.to, params.actorRole);

  if (params.to === PropertyStatus.LIVE) {
    await assertWithinListingLimit(property.agentProfile.userId);
  }

  return db.property.update({
    where: { id: property.id },
    data: {
      status: params.to,
      ...(params.to === PropertyStatus.LIVE ? { publishedAt: new Date() } : {}),
    },
  });
}
