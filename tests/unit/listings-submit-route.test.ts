import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/authz", () => ({ requireRole: vi.fn() }));
vi.mock("@/services/listings/listingService", () => ({ submitForReview: vi.fn() }));

import { requireRole } from "@/lib/authz";
import { submitForReview } from "@/services/listings/listingService";
import { ListingServiceError } from "@/services/listings/errors";
import { POST } from "@/app/api/listings/[id]/submit/route";

const mockRequireRole = vi.mocked(requireRole);
const mockSubmitForReview = vi.mocked(submitForReview);

function request() {
  return new Request("http://localhost/api/listings/prop-1/submit", { method: "POST" });
}

function ctx(id = "prop-1") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/listings/[id]/submit", () => {
  it("returns 401 when unauthenticated", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await POST(request(), ctx());
    expect(res.status).toBe(401);
    expect(mockSubmitForReview).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-AGENT role", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const res = await POST(request(), ctx());
    expect(res.status).toBe(403);
  });

  it("submits the listing and returns the updated status on success", async () => {
    mockRequireRole.mockResolvedValue({
      ok: true,
      session: { user: { id: "u1", role: "AGENT" } } as never,
    });
    mockSubmitForReview.mockResolvedValue({
      id: "prop-1",
      status: "PENDING_REVIEW",
    } as never);

    const res = await POST(request(), ctx("prop-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("PENDING_REVIEW");
    expect(mockSubmitForReview).toHaveBeenCalledWith({
      userId: "u1",
      propertyId: "prop-1",
    });
  });

  it("maps a VALIDATION error (listing not ready) to HTTP 400", async () => {
    mockRequireRole.mockResolvedValue({
      ok: true,
      session: { user: { id: "u1", role: "AGENT" } } as never,
    });
    mockSubmitForReview.mockRejectedValue(
      new ListingServiceError(
        "Cannot submit for review — missing: an EPC rating.",
        "VALIDATION",
      ),
    );

    const res = await POST(request(), ctx());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/EPC/);
  });

  it("maps a FORBIDDEN error to HTTP 403", async () => {
    mockRequireRole.mockResolvedValue({
      ok: true,
      session: { user: { id: "u1", role: "AGENT" } } as never,
    });
    mockSubmitForReview.mockRejectedValue(
      new ListingServiceError("You do not own this listing", "FORBIDDEN"),
    );

    const res = await POST(request(), ctx());
    expect(res.status).toBe(403);
  });
});
