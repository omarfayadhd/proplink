import { z } from "zod";
import { DistressTag, EpcRating, PropertyType } from "@/generated/prisma/enums";
import { ListingServiceError } from "@/services/listings/errors";
import { isValidUkPostcode } from "@/services/maps";

// £20,000,000 in pence. Business-sensible ceiling for this market (large
// commercial/land distressed assets included) that also stays comfortably
// inside Postgres' int4 range backing `Property.askingPriceGBP`
// (max 2,147,483,647 pence ≈ £21.47m) — a higher Zod cap would let a legal
// price pass validation and then blow up in Prisma with "integer out of
// range" (an unhandled 500, not a clean ListingServiceError). Raising this
// requires widening the DB column too; don't change one without the other.
export const MAX_ASKING_PRICE_PENCE = 2_000_000_000; // £20,000,000
const MAX_ROI_PCT = 1000;
const MAX_IMAGES = 20;

export const listingImageSchema = z.object({
  url: z.string().min(1),
  sortOrder: z.number().int().min(0),
});

const postcodeSchema = z
  .string()
  .trim()
  .min(5)
  .max(10)
  .refine(isValidUkPostcode, { message: "Enter a valid UK postcode" });

// Bare (no-default) field schemas, shared between create and update. Bare on
// purpose: `updateListingSchema` below is `.partial()`, and a Zod `.default()`
// still fires when a key is *absent* even under `.partial()` — if these
// carried defaults, an update PATCH that omits e.g. `distressTags` would
// silently reset it to `[]` instead of leaving it untouched. Defaults are
// applied only where `createListingSchema` re-declares the field.
const bedroomsSchema = z.number().int().min(0).max(50);
const distressTagsSchema = z.array(z.enum(DistressTag)).max(8);
const imagesSchema = z.array(listingImageSchema).max(MAX_IMAGES);
/** Step 3 confirmation checkbox — true only once the agent has ticked it. */
const pricingSafeguardAckSchema = z.boolean();

// Fields required to persist a Property row at all (NOT NULL columns in the
// schema) — present from the moment "Save Draft" first creates the listing.
// Everything else (distress tags, EPC, media, ROI) is optional at draft time
// and only enforced by `assertReadyForSubmission` before PENDING_REVIEW.
const listingFieldsSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10),
  addressLine1: z.string().trim().min(1),
  city: z.string().trim().min(1),
  region: z.string().trim().min(1),
  postcode: postcodeSchema,
  propertyType: z.enum(PropertyType),
  bedrooms: bedroomsSchema,
  askingPriceGBP: z.number().int().positive().max(MAX_ASKING_PRICE_PENCE),
  targetRoiPct: z.number().min(0).max(MAX_ROI_PCT).nullable().optional(),
  distressTags: distressTagsSchema,
  epcRating: z.enum(EpcRating).nullable().optional(),
  epcCertUrl: z.string().url().nullable().optional(),
  floorPlanUrl: z.string().url().nullable().optional(),
  images: imagesSchema,
  pricingSafeguardAck: pricingSafeguardAckSchema,
});

export const createListingSchema = listingFieldsSchema.extend({
  agentProfileId: z.string().trim().min(1, "agentProfileId is required"),
  bedrooms: bedroomsSchema.default(0),
  distressTags: distressTagsSchema.default([]),
  images: imagesSchema.default([]),
  pricingSafeguardAck: pricingSafeguardAckSchema.default(false),
});

export const updateListingSchema = listingFieldsSchema.partial();

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;

/**
 * Domain-level "is this listing complete enough to submit" gate — separate
 * from the (lenient) create/update Zod schemas because a DRAFT is allowed to
 * be incomplete. Called by `submitForReview` against the persisted row.
 */
export function assertReadyForSubmission(property: {
  distressTags: unknown[];
  pricingSafeguardAckAt: Date | null;
  epcRating: string | null;
}): void {
  const missing: string[] = [];
  if (property.distressTags.length === 0) missing.push("at least one distress tag");
  if (!property.pricingSafeguardAckAt) {
    missing.push("the post-survey pricing safeguard confirmation");
  }
  if (!property.epcRating) missing.push("an EPC rating");

  if (missing.length > 0) {
    throw new ListingServiceError(
      `Cannot submit for review — missing: ${missing.join(", ")}.`,
      "VALIDATION",
    );
  }
}
