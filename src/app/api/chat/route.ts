import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { messageSchema, sendMessage } from "@/services/chat/chatService";

// TODO(H1.5): rate-limit with @upstash/ratelimit once Upstash keys exist.
// TODO(H4.2): publish to a Pusher private channel once Pusher exists — the
// thread persists correctly without it, it simply does not push (ADR-017).

/**
 * Send a message on a property thread (Task 5.7).
 *
 * Any signed-in role may send: a buyer starts the thread and the agent who owns
 * the listing replies. Both ends are derived server-side — the sender from the
 * session, the recipient from the property's agent — so neither can be spoofed.
 */
export async function POST(request: Request) {
  const authz = await requireRole();
  if (!authz.ok) return authz.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await sendMessage(authz.session.user.id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

  return NextResponse.json(result.message, { status: 201 });
}
