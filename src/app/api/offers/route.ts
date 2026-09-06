import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { offerSchema, submitOffer } from "@/services/offers/offerService";

// TODO(H1.5): rate-limit with @upstash/ratelimit once Upstash keys exist.

/**
 * Submit an offer on a property (Task 5.7). BUYER only.
 *
 * Not a syndicate pledge: the EOI constraint and the KYC gate cover pledges
 * (docs/CONTEXT.md §1–2). No money moves through the platform here either — an
 * offer is a number, and the agent accepts or rejects it.
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

  const parsed = offerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await submitOffer(authz.session.user.id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

  return NextResponse.json(result.offer, { status: 201 });
}
