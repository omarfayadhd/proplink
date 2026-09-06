import { NextResponse } from "next/server";
import { parseSearchParams, searchService } from "@/services/search";

/**
 * Public marketplace search (Task 3.1). No `requireRole` — the marketplace is
 * the shop window, and gating browsing behind a session would defeat it.
 *
 * Malformed query params are dropped by `parseSearchParams` rather than
 * rejected, so a stale or hand-edited shared link degrades to a broader search
 * instead of a 400.
 */
// TODO(H1.5): rate-limit with @upstash/ratelimit once Upstash keys exist —
// public and query-heavy, even though it is a read.
export async function GET(request: Request) {
  const params = parseSearchParams(new URL(request.url).searchParams);
  const result = await searchService.search(params);

  return NextResponse.json(result, { status: 200 });
}
