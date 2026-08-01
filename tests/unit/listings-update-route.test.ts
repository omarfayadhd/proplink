import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/authz", () => ({ requireRole: vi.fn() }));
vi.mock("@/services/listings/listingService", () => ({ updateDraft: vi.fn() }));

import { requireRole } from "@/lib/authz";
import { updateDraft } from "@/services/listings/listingService";
import { ListingServiceError } from "@/services/listings/errors";
import { PATCH } from "@/app/api/listings/[id]/route";

const mockRequireRole = vi.mocked(requireRole);
const mockUpdateDraft = vi.mocked(updateDraft);

function request(body: unknown) {
  return new Request("http://localhost/api/listings/prop-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx(id = "prop-1") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => vi.clearAllMocks());

describe("PATCH /api/listings/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await PATCH(request({ title: "New title" }), ctx());
    expect(res.status).toBe(401);
    expect(mockUpdateDraft).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid partial body", async () => {
    mockRequireRole.mockResolvedValue({
      ok: true,
      session: { user: { id: "u1", role: "AGENT" } } as never,
    });

    const res = await PATCH(request({ postcode: "nope" }), ctx());
    expect(res.status).toBe(400);
    expect(mockUpdateDraft).not.toHaveBeenCalled();
  });

  it("accepts an empty body (no-op save) and calls the service with the route id", async () => {
    mockRequireRole.mockResolvedValue({
      ok: true,
      session: { user: { id: "u1", role: "AGENT" } } as never,
    });
    mockUpdateDraft.mockResolvedValue({ id: "prop-1", status: "DRAFT" } as never);

    const res = await PATCH(request({}), ctx("prop-1"));
    expect(res.status).toBe(200);
    expect(mockUpdateDraft).toHaveBeenCalledWith({
      userId: "u1",
      propertyId: "prop-1",
      input: {},
    });
  });

  it("maps NOT_FOUND to HTTP 404", async () => {
    mockRequireRole.mockResolvedValue({
      ok: true,
      session: { user: { id: "u1", role: "AGENT" } } as never,
    });
    mockUpdateDraft.mockRejectedValue(
      new ListingServiceError("Listing not found", "NOT_FOUND"),
    );

    const res = await PATCH(request({}), ctx());
    expect(res.status).toBe(404);
  });

  it("maps TRANSITION_INVALID (editing a non-DRAFT listing) to HTTP 409", async () => {
    mockRequireRole.mockResolvedValue({
      ok: true,
      session: { user: { id: "u1", role: "AGENT" } } as never,
    });
    mockUpdateDraft.mockRejectedValue(
      new ListingServiceError("Only DRAFT listings can be edited", "TRANSITION_INVALID"),
    );

    const res = await PATCH(request({}), ctx());
    expect(res.status).toBe(409);
  });
});
