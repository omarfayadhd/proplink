import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";

/**
 * Viewing requests (ADR-017, sprint plan Task 5.7).
 *
 * A buyer requests a slot; the agent confirms or declines. Nothing here is
 * FCA-regulated — the EOI constraint applies to syndicate pledges only — so
 * unlike the investor side this is a real write path.
 *
 * The buyer is taken from the session by the caller and passed in; it is never
 * read from the request body, or a buyer could book in someone else's name.
 */

export const viewingRequestSchema = z.object({
  propertyId: z.string().min(1),
  /** ISO datetime. The slot is one hour from this instant. */
  slotStart: z.iso.datetime(),
});

export type ViewingRequestInput = z.infer<typeof viewingRequestSchema>;

/** Viewings run for an hour; the buyer picks a start, not a range. */
const SLOT_MINUTES = 60;

export async function requestViewing(buyerUserId: string, input: ViewingRequestInput) {
  const property = await db.property.findUnique({
    where: { id: input.propertyId },
    select: { id: true, status: true },
  });

  // Only stock a buyer can actually see. Requesting a viewing on a draft or
  // rejected listing would leak that it exists.
  if (!property || !["LIVE", "UNDER_OFFER"].includes(property.status)) {
    return { ok: false as const, error: "Property not available for viewing" };
  }

  const slotStart = new Date(input.slotStart);
  if (slotStart.getTime() < Date.now()) {
    return { ok: false as const, error: "Choose a time in the future" };
  }

  // One standing request per property per buyer: re-submitting is almost always
  // an impatient second click, not a second viewing.
  const existing = await db.viewing.findFirst({
    where: { propertyId: property.id, buyerUserId, status: "REQUESTED" },
  });
  if (existing) {
    return { ok: false as const, error: "You already have a viewing request pending" };
  }

  const viewing = await db.viewing.create({
    data: {
      propertyId: property.id,
      buyerUserId,
      slotStart,
      slotEnd: new Date(slotStart.getTime() + SLOT_MINUTES * 60_000),
    },
  });

  return { ok: true as const, viewing };
}

export async function listBuyerViewings(buyerUserId: string) {
  return db.viewing.findMany({
    where: { buyerUserId },
    orderBy: { slotStart: "desc" },
    include: { property: { select: { id: true, title: true, city: true } } },
  });
}
