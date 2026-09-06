import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";

/**
 * Buyer↔agent messaging per property (ADR-017, sprint plan Task 5.7).
 *
 * **Persisted, not live.** Task 5.7 specifies Pusher private channels; Pusher is
 * H4.2 and not provisioned (docs/BLOCKERS.md). Everything except the live
 * channel is real here — messages persist, both sides see the whole thread,
 * unread counts are accurate — and the thread refreshes on navigation rather
 * than pushing. Adding Pusher later is a subscription on top; the data model and
 * the UI do not change.
 *
 * Both participants are derived server-side: the sender from the session, the
 * recipient from the property's agent. Neither is ever taken from the request,
 * or a buyer could write into someone else's thread.
 */

export const messageSchema = z.object({
  propertyId: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
});

export type MessageInput = z.infer<typeof messageSchema>;

/** The agent who owns a property, i.e. the other end of a buyer's thread. */
async function agentUserIdFor(propertyId: string) {
  const property = await db.property.findUnique({
    where: { id: propertyId },
    select: { status: true, agentProfile: { select: { userId: true } } },
  });
  if (!property || !["LIVE", "UNDER_OFFER"].includes(property.status)) return null;
  return property.agentProfile?.userId ?? null;
}

export async function sendMessage(fromUserId: string, input: MessageInput) {
  const toUserId = await agentUserIdFor(input.propertyId);
  if (!toUserId) return { ok: false as const, error: "Property not available" };
  if (toUserId === fromUserId) {
    return { ok: false as const, error: "You cannot message yourself" };
  }

  const message = await db.chatMessage.create({
    data: { propertyId: input.propertyId, fromUserId, toUserId, body: input.body },
  });
  return { ok: true as const, message };
}

/**
 * One property's thread as it looks to `userId`.
 *
 * Scoped to messages this user sent or received on this property, so a thread
 * can never surface a third party's conversation about the same listing.
 */
export async function getThread(userId: string, propertyId: string) {
  return db.chatMessage.findMany({
    where: {
      propertyId,
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
    orderBy: { createdAt: "asc" },
    include: { from: { select: { id: true, name: true } } },
  });
}

/** Marks everything addressed to this user on this property as read. */
export async function markThreadRead(userId: string, propertyId: string) {
  await db.chatMessage.updateMany({
    where: { propertyId, toUserId: userId, readAt: null },
    data: { readAt: new Date() },
  });
}

/** Every property this user has a thread on, newest activity first. */
export async function listThreads(userId: string) {
  const messages = await db.chatMessage.findMany({
    where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { id: true, title: true } } },
  });

  // Grouped in memory rather than by SQL: a buyer's thread count is small, and
  // the alternative is a groupBy that cannot carry the last message with it.
  const byProperty = new Map<
    string,
    { propertyId: string; title: string; last: string; at: Date; unread: number }
  >();

  for (const m of messages) {
    const entry = byProperty.get(m.propertyId);
    if (!entry) {
      byProperty.set(m.propertyId, {
        propertyId: m.propertyId,
        title: m.property.title,
        last: m.body,
        at: m.createdAt,
        unread: m.toUserId === userId && m.readAt === null ? 1 : 0,
      });
    } else if (m.toUserId === userId && m.readAt === null) {
      entry.unread += 1;
    }
  }

  return [...byProperty.values()];
}
