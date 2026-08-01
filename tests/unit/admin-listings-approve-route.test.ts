import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/authz", () => ({ requireRole: vi.fn() }));
vi.mock("@/services/listings/moderationService", () => ({ approveListing: vi.fn() }));

import { requireRole } from "@/lib/authz";
import { approveListing } from "@/services/listings/moderationService";
import { ListingServiceError } from "@/services/listings/errors";
import { POST } from "@/app/api/admin/listings/[id]/approve/route";

const mockRequireRole = vi.mocked(requireRole);
const mockApprove = vi.mocked(approveListing);

function request() {
  return new Request("http://localhost/api/admin/listings/prop-1/approve", {
    method: "POST",
  });
}

function ctx(id = "prop-1") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/admin/listings/[id]/approve", () => {
  it("returns 401 when unauthenticated", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await POST(request(), ctx());
    expect(res.status).toBe(401);
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-ADMIN role", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const res = await POST(request(), ctx());
    expect(res.status).toBe(403);
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it("approves the listing and returns it on success", async () => {
    mockRequireRole.mockResolvedValue({
      ok: true,
      session: { user: { id: "admin-1", role: "ADMIN" } } as never,
    });
    mockApprove.mockResolvedValue({ id: "prop-1", status: "LIVE" } as never);

    const res = await POST(request(), ctx("prop-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("LIVE");
    expect(mockApprove).toHaveBeenCalledWith({
      listingId: "prop-1",
      adminUserId: "admin-1",
    });
  });

  it("maps LIMIT_EXCEEDED to HTTP 409", async () => {
    mockRequireRole.mockResolvedValue({
      ok: true,
      session: { user: { id: "admin-1", role: "ADMIN" } } as never,
    });
    mockApprove.mockRejectedValue(
      new ListingServiceError("Listing limit reached", "LIMIT_EXCEEDED"),
    );

    const res = await POST(request(), ctx());
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("LIMIT_EXCEEDED");
  });

  it("maps NOT_FOUND to HTTP 404", async () => {
    mockRequireRole.mockResolvedValue({
      ok: true,
      session: { user: { id: "admin-1", role: "ADMIN" } } as never,
    });
    mockApprove.mockRejectedValue(
      new ListingServiceError("Listing not found", "NOT_FOUND"),
    );

    const res = await POST(request(), ctx());
    expect(res.status).toBe(404);
  });
});
