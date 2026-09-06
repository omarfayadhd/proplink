import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";

/**
 * Buyer offers and the deal that follows one (ADR-017, sprint plan Task 5.7).
 *
 * **Not the syndicate path.** The EOI constraint and the KYC gate cover
 * syndicate pledges (docs/CONTEXT.md §1–2); a buyer offering on a property is an
 * ordinary purchase negotiation and no money moves through the platform here
 * either — the offer is a number, and conveyancing happens off-platform.
 *
 * Money is integer pence. `amountGBP` arrives in pence and is validated as an
 * integer, so a float can never enter the column.
 */

export const offerSchema = z.object({
  propertyId: z.string().min(1),
  /** Pence. Integer-only — never a float (AGENTS.md § non-negotiables). */
  amountGBP: z
    .number()
    .int()
    .positive()
    // £50m in pence: a sanity ceiling, so a mistyped figure is rejected at the
    // edge rather than stored and shown to an agent as a real offer.
    .max(5_000_000_000),
});

export type OfferInput = z.infer<typeof offerSchema>;

export async function submitOffer(buyerUserId: string, input: OfferInput) {
  const property = await db.property.findUnique({
    where: { id: input.propertyId },
    select: { id: true, status: true, askingPriceGBP: true },
  });

  if (!property || !["LIVE", "UNDER_OFFER"].includes(property.status)) {
    return { ok: false as const, error: "Property not available for offers" };
  }

  // One live offer per buyer per property. Improving an offer means withdrawing
  // the last one, which keeps the agent's queue honest.
  const existing = await db.offer.findFirst({
    where: { propertyId: property.id, buyerUserId, status: "SUBMITTED" },
  });
  if (existing) {
    return { ok: false as const, error: "You already have an offer awaiting a decision" };
  }

  const offer = await db.offer.create({
    data: { propertyId: property.id, buyerUserId, amountGBP: input.amountGBP },
  });

  return { ok: true as const, offer };
}

export async function withdrawOffer(buyerUserId: string, offerId: string) {
  // Scoped by buyer in the `where`, so one buyer can never withdraw another's.
  const result = await db.offer.updateMany({
    where: { id: offerId, buyerUserId, status: "SUBMITTED" },
    data: { status: "WITHDRAWN" },
  });
  return { ok: result.count === 1 };
}

export async function listBuyerOffers(buyerUserId: string) {
  return db.offer.findMany({
    where: { buyerUserId },
    orderBy: { createdAt: "desc" },
    include: {
      property: { select: { id: true, title: true, askingPriceGBP: true } },
      deals: { orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });
}
