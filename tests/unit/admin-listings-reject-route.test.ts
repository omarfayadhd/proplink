import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/authz", () => ({ requireRole: vi.fn() }));
vi.mock("@/services/listings/moderationService", () => ({ rejectListing: vi.fn() }));

import { requireRole } from "@/lib/authz";
import { rejectListing } from "@/services/listings/moderationService";
import { ListingServiceError } from "@/services/listings/errors";
import { POST } from "@/app/api/admin/listings/[id]/reject/route";

const mockRequireRole = vi.mocked(requireRole);
const mockReject = vi.mocked(rejectListing);

function request(body: unknown) {
  return new Request("http://localhost/api/admin/listings/prop-1/reject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function invalidJsonRequest() {
  return new Request("http://localhost/api/admin/listings/prop-1/reject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not json",
  });
}

function ctx(id = "prop-1") {
  return { params: Promise.resolve({ id }) };
}

const adminSession = {
  ok: true as const,
  session: { user: { id: "admin-1", role: "ADMIN" } } as never,
};

beforeEach(() => vi.clearAllMocks());

describe("POST /api/admin/listings/[id]/reject", () => {
  it("returns 401 when unauthenticated", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await POST(request({ reason: "x" }), ctx());
    expect(res.status).toBe(401);
    expect(mockReject).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-ADMIN role", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const res = await POST(request({ reason: "x" }), ctx());
    expect(res.status).toBe(403);
    expect(mockReject).not.toHaveBeenCalled();
  });

  it("400s on invalid JSON body", async () => {
    mockRequireRole.mockResolvedValue(adminSession);

    const res = await POST(invalidJsonRequest(), ctx());
    expect(res.status).toBe(400);
    expect(mockReject).not.toHaveBeenCalled();
  });

  it("400s when reason is empty", async () => {
    mockRequireRole.mockResolvedValue(adminSession);

    const res = await POST(request({ reason: "" }), ctx());
    expect(res.status).toBe(400);
    expect(mockReject).not.toHaveBeenCalled();
  });

  it("400s when reason is whitespace-only", async () => {
    mockRequireRole.mockResolvedValue(adminSession);

    const res = await POST(request({ reason: "   " }), ctx());
    expect(res.status).toBe(400);
    expect(mockReject).not.toHaveBeenCalled();
  });

  it("400s when reason is missing entirely", async () => {
    mockRequireRole.mockResolvedValue(adminSession);

    const res = await POST(request({}), ctx());
    expect(res.status).toBe(400);
    expect(mockReject).not.toHaveBeenCalled();
  });

  it("rejects the listing with the given reason on success", async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockReject.mockResolvedValue({ id: "prop-1", status: "DRAFT" } as never);

    const res = await POST(request({ reason: "Missing EPC certificate" }), ctx("prop-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("DRAFT");
    expect(mockReject).toHaveBeenCalledWith({
      listingId: "prop-1",
      adminUserId: "admin-1",
      reason: "Missing EPC certificate",
    });
  });

  it("maps NOT_FOUND to HTTP 404", async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockReject.mockRejectedValue(
      new ListingServiceError("Listing not found", "NOT_FOUND"),
    );

    const res = await POST(request({ reason: "x" }), ctx());
    expect(res.status).toBe(404);
  });

  it("maps TRANSITION_INVALID to HTTP 409", async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockReject.mockRejectedValue(
      new ListingServiceError("Cannot reject a LIVE listing", "TRANSITION_INVALID"),
    );

    const res = await POST(request({ reason: "x" }), ctx());
    expect(res.status).toBe(409);
  });
});
