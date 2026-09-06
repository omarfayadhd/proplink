import "server-only";
import { db } from "@/lib/db";

/**
 * Read side of the buyer portal (ADR-016, sprint plan Task 5.7).
 *
 * **Read-only by design.** Chat, viewing requests, offers and the deal tracker
 * are Sprint 5 write flows; this surfaces what already exists so a buyer can see
 * their own activity in one place, and adds no new way to create any of it.
 *
 * Everything is scoped to `userId` in the query itself rather than filtered
 * after the fact — a buyer must never be able to read another buyer's enquiries,
 * viewings or offers, and the safest place to enforce that is the `where`.
 */

export interface BuyerActivityRow {
  id: string;
  propertyId: string;
  propertyTitle: string;
  createdAt: Date;
  /** Free-text status for display: enquiry state, viewing state, offer state. */
  status: string;
  /** Offers only — the amount in pence. */
  amountGBP?: number;
  /** Viewings only. */
  slotStart?: Date;
}

export interface BuyerDashboard {
  savedCount: number;
  saved: { id: string; title: string; askingPriceGBP: number }[];
  enquiries: BuyerActivityRow[];
  viewings: BuyerActivityRow[];
  offers: BuyerActivityRow[];
}

/** How many rows each list shows before it defers to its own page. */
const PREVIEW = 5;

export async function getBuyerDashboard(userId: string): Promise<BuyerDashboard> {
  const [savedCount, saved, enquiries, viewings, offers] = await Promise.all([
    db.savedProperty.count({ where: { userId } }),
    // `SavedProperty` is a join row: composite key, no id and no timestamp, so
    // there is nothing to order by. Ordering by the property's own createdAt
    // keeps the list stable rather than arbitrary.
    db.savedProperty.findMany({
      where: { userId },
      orderBy: { property: { createdAt: "desc" } },
      take: PREVIEW,
      include: { property: { select: { id: true, title: true, askingPriceGBP: true } } },
    }),
    db.enquiry.findMany({
      where: { fromUserId: userId },
      orderBy: { createdAt: "desc" },
      take: PREVIEW,
      include: { property: { select: { title: true } } },
    }),
    db.viewing.findMany({
      where: { buyerUserId: userId },
      orderBy: { slotStart: "desc" },
      take: PREVIEW,
      include: { property: { select: { title: true } } },
    }),
    db.offer.findMany({
      where: { buyerUserId: userId },
      orderBy: { createdAt: "desc" },
      take: PREVIEW,
      include: { property: { select: { title: true } } },
    }),
  ]);

  return {
    savedCount,
    saved: saved.map((s) => ({
      id: s.property.id,
      title: s.property.title,
      askingPriceGBP: s.property.askingPriceGBP,
    })),
    enquiries: enquiries.map((e) => ({
      id: e.id,
      propertyId: e.propertyId,
      propertyTitle: e.property.title,
      createdAt: e.createdAt,
      status: e.status,
    })),
    viewings: viewings.map((v) => ({
      id: v.id,
      propertyId: v.propertyId,
      propertyTitle: v.property.title,
      // Viewings sort by slot, so that is the date worth showing.
      createdAt: v.slotStart,
      slotStart: v.slotStart,
      status: v.status,
    })),
    offers: offers.map((o) => ({
      id: o.id,
      propertyId: o.propertyId,
      propertyTitle: o.property.title,
      createdAt: o.createdAt,
      status: o.status,
      amountGBP: o.amountGBP,
    })),
  };
}
