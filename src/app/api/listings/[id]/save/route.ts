import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { Role } from "@/generated/prisma/enums";
import { saveListing, unsaveListing } from "@/services/listings/savedProperties";
import { ListingServiceError, listingErrorStatus } from "@/services/listings/errors";

/**
 * Save / unsave a listing to the viewer's watchlist (Task 2.6).
 *
 * BUYER and INVESTOR only: saving is a demand-side signal, and an agent
 * bookmarking their own stock (or an admin browsing the queue) would pollute
 * the saves metric shown back to agents. Both verbs are idempotent in the
 * service, so a double-click or a stale UI state is never an error.
 */
// TODO(H1.5): rate-limit with @upstash/ratelimit once Upstash keys exist.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await requireRole(Role.BUYER, Role.INVESTOR);
  if (!authz.ok) return authz.response;

  const { id } = await params;

  try {
    await saveListing({ userId: authz.session.user.id, propertyId: id });
    return NextResponse.json({ saved: true }, { status: 200 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await requireRole(Role.BUYER, Role.INVESTOR);
  if (!authz.ok) return authz.response;

  const { id } = await params;

  try {
    await unsaveListing({ userId: authz.session.user.id, propertyId: id });
    return NextResponse.json({ saved: false }, { status: 200 });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown) {
  if (err instanceof ListingServiceError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: listingErrorStatus(err.code) },
    );
  }
  throw err;
}
