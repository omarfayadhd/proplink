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

/**
 * How many items sit behind each buyer tab, for the badges on the portal's
 * navigation (ADR-020).
 *
 * The tabs previously read as six identical words, so a buyer had to open each
 * one to discover whether it held anything; a count on the tab answers that
 * before the click. Counts, not rows — this runs on every buyer page render.
 *
 * `unreadMessages` is the only *actionable* number here: it counts messages
 * addressed **to** this user that they have not opened, which is why it renders
 * as an alert rather than as a neutral total like the others.
 */
export interface BuyerActivityCounts {
  saved: number;
  enquiries: number;
  viewings: number;
  offers: number;
  unreadMessages: number;
}

export async function getBuyerActivityCounts(
  userId: string,
): Promise<BuyerActivityCounts> {
  const [saved, enquiries, viewings, offers, unreadMessages] = await Promise.all([
    db.savedProperty.count({ where: { userId } }),
    db.enquiry.count({ where: { fromUserId: userId } }),
    db.viewing.count({ where: { buyerUserId: userId } }),
    db.offer.count({ where: { buyerUserId: userId } }),
    // Indexed on `[toUserId, readAt]`, so this stays a cheap index-only count
    // rather than a scan of the buyer's whole message history.
    db.chatMessage.count({ where: { toUserId: userId, readAt: null } }),
  ]);

  return { saved, enquiries, viewings, offers, unreadMessages };
}
