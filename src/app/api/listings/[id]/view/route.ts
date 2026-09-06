import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  VIEWED_LISTINGS_COOKIE,
  parseViewedListings,
  recordListingView,
  serialiseViewedListings,
} from "@/services/listings/analytics";
import { ListingServiceError, listingErrorStatus } from "@/services/listings/errors";

/**
 * View beacon for the public detail page (Task 2.6).
 *
 * A route handler rather than the page itself because a React Server Component
 * cannot set cookies during render — and the per-session dedupe the brief asks
 * for needs to write one. `<ViewTracker>` pings this once on mount; the useful
 * side effect is that a view then means "a browser that runs JS rendered the
 * page", which is closer to a real visit than a crawler fetching HTML.
 *
 * Deliberately **not** behind `requireRole()`: an anonymous visitor's view is
 * the most common kind and must count. `auth()` is read only to identify the
 * viewer, so the service can exclude the owning agent's and admins' own views.
 */
// TODO(H1.5): rate-limit with @upstash/ratelimit once Upstash keys exist —
// this endpoint is public and write-capable, even if the write is a counter.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  const viewer = session?.user
    ? { userId: session.user.id, role: session.user.role }
    : null;

  const viewedIds = parseViewedListings(
    request.cookies.get(VIEWED_LISTINGS_COOKIE)?.value,
  );

  try {
    const result = await recordListingView({ propertyId: id, viewer, viewedIds });

    const response = NextResponse.json({ counted: result.counted }, { status: 200 });
    // No `maxAge`/`expires`: a session cookie, which is exactly the dedupe
    // window ("once per session"). `sameSite: lax` because this is only ever
    // called from our own page.
    response.cookies.set(
      VIEWED_LISTINGS_COOKIE,
      serialiseViewedListings(result.viewedIds),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
    );
    return response;
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
