import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/authz", () => ({ requireRole: vi.fn() }));
vi.mock("@/services/listings/listingService", () => ({ createDraft: vi.fn() }));

import { requireRole } from "@/lib/authz";
import { createDraft } from "@/services/listings/listingService";
import { ListingServiceError } from "@/services/listings/errors";
import { POST } from "@/app/api/listings/route";

const mockRequireRole = vi.mocked(requireRole);
const mockCreateDraft = vi.mocked(createDraft);

function request(body: unknown) {
  return new Request("http://localhost/api/listings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  agentProfileId: "profile-1",
  title: "Three-bed semi needing full refurbishment",
  description:
    "Probate sale, vacant since 2024, subsidence reported on the rear elevation.",
  addressLine1: "12 Example Road",
  city: "Manchester",
  region: "Greater Manchester",
  postcode: "M1 1AE",
  propertyType: "RESIDENTIAL",
  bedrooms: 3,
  askingPriceGBP: 15_000_00,
};

beforeEach(() => vi.clearAllMocks());

describe("POST /api/listings", () => {
  it("returns 401 when unauthenticated", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await POST(request(validBody));
    expect(res.status).toBe(401);
    expect(mockCreateDraft).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-AGENT role", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const res = await POST(request(validBody));
    expect(res.status).toBe(403);
    expect(mockCreateDraft).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body without calling the service", async () => {
    mockRequireRole.mockResolvedValue({
      ok: true,
      session: { user: { id: "u1", role: "AGENT" } } as never,
    });

    const res = await POST(request({ ...validBody, askingPriceGBP: -1 }));
    expect(res.status).toBe(400);
    expect(mockCreateDraft).not.toHaveBeenCalled();
  });

  it("returns 400 for unparsable JSON", async () => {
    mockRequireRole.mockResolvedValue({
      ok: true,
      session: { user: { id: "u1", role: "AGENT" } } as never,
    });

    const res = await POST(
      new Request("http://localhost/api/listings", { method: "POST", body: "not json" }),
    );
    expect(res.status).toBe(400);
  });

  it("creates the draft and returns 201 on a valid request", async () => {
    mockRequireRole.mockResolvedValue({
      ok: true,
      session: { user: { id: "u1", role: "AGENT" } } as never,
    });
    mockCreateDraft.mockResolvedValue({ id: "prop-1", status: "DRAFT" } as never);

    const res = await POST(request(validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("prop-1");
    expect(mockCreateDraft).toHaveBeenCalledWith({
      userId: "u1",
      input: expect.objectContaining({ agentProfileId: "profile-1" }),
    });
  });

  it("maps a FORBIDDEN service error (agent profile not owned) to HTTP 403", async () => {
    mockRequireRole.mockResolvedValue({
      ok: true,
      session: { user: { id: "u1", role: "AGENT" } } as never,
    });
    mockCreateDraft.mockRejectedValue(
      new ListingServiceError("You do not own this profile", "FORBIDDEN"),
    );

    const res = await POST(request(validBody));
    expect(res.status).toBe(403);
  });
});
