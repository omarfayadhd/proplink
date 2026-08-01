import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { Role } from "@/generated/prisma/enums";
import { rejectListingSchema } from "@/services/listings/validation";
import { rejectListing } from "@/services/listings/moderationService";
import { ListingServiceError, listingErrorStatus } from "@/services/listings/errors";

// TODO(week-2): rate-limit with @upstash/ratelimit once H1.5 keys are in.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await requireRole(Role.ADMIN);
  if (!authz.ok) return authz.response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = rejectListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const listing = await rejectListing({
      listingId: id,
      adminUserId: authz.session.user.id,
      reason: parsed.data.reason,
    });
    return NextResponse.json(listing, { status: 200 });
  } catch (err) {
    if (err instanceof ListingServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: listingErrorStatus(err.code) },
      );
    }
    throw err;
  }
}
