import { NextResponse } from "next/server";
import { parseSearchParams, searchService } from "@/services/search";

/**
 * Live result count for the filter sidebar (Task 3.1's "real-time result count
 * endpoint", debounced from the UI in Task 3.2).
 *
 * Separate from `GET /api/search` on purpose: the sidebar updates its
 * "N properties" label on every slider drag and keystroke, and fetching a page
 * of rows to render a number would be pure waste.
 */
// TODO(H1.5): rate-limit with @upstash/ratelimit once Upstash keys exist —
// this is the highest-frequency public endpoint in the app.
export async function GET(request: Request) {
  const params = parseSearchParams(new URL(request.url).searchParams);
  const count = await searchService.count(params);

  return NextResponse.json({ count }, { status: 200 });
}
