import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { requestViewing, viewingRequestSchema } from "@/services/viewings/viewingService";

// TODO(H1.5): rate-limit with @upstash/ratelimit once Upstash keys exist.

/**
 * Request a viewing (Task 5.7). BUYER only — an agent viewing their own stock is
 * not a thing, and an investor's route into a property is the syndicate, not a
 * viewing booking. The buyer is taken from the session, never the body.
 */
export async function POST(request: Request) {
  const authz = await requireRole("BUYER", "ADMIN");
  if (!authz.ok) return authz.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = viewingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await requestViewing(authz.session.user.id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

  return NextResponse.json(result.viewing, { status: 201 });
}
