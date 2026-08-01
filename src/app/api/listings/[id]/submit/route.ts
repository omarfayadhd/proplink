import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { Role } from "@/generated/prisma/enums";
import { submitForReview } from "@/services/listings/listingService";
import { ListingServiceError, listingErrorStatus } from "@/services/listings/errors";

// TODO(week-2): rate-limit with @upstash/ratelimit once H1.5 keys are in.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await requireRole(Role.AGENT);
  if (!authz.ok) return authz.response;

  const { id } = await params;

  try {
    const listing = await submitForReview({
      userId: authz.session.user.id,
      propertyId: id,
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
