import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/authz", () => ({ requireRole: vi.fn() }));
vi.mock("@/services/enquiries/enquiryService", () => ({ createEnquiry: vi.fn() }));

import { requireRole } from "@/lib/authz";
import { createEnquiry } from "@/services/enquiries/enquiryService";
import { EnquiryServiceError } from "@/services/enquiries/errors";
import { POST } from "@/app/api/enquiries/route";

const mockRequireRole = vi.mocked(requireRole);
const mockCreateEnquiry = vi.mocked(createEnquiry);

function request(body: unknown) {
  return new Request("http://localhost/api/enquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const buyerSession = {
  ok: true as const,
  session: { user: { id: "buyer-1", role: "BUYER" } } as never,
};

const validBody = {
  propertyId: "property-1",
  message: "I would like to arrange a viewing for this property, please.",
};

beforeEach(() => vi.clearAllMocks());

describe("POST /api/enquiries", () => {
  it("returns 401 when unauthenticated", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await POST(request(validBody));
    expect(res.status).toBe(401);
    expect(mockCreateEnquiry).not.toHaveBeenCalled();
  });

  it("requires only a session — no role restriction (any authenticated user may enquire)", async () => {
    mockRequireRole.mockResolvedValue(buyerSession);
    mockCreateEnquiry.mockResolvedValue({ id: "enquiry-1" } as never);

    await POST(request(validBody));

    expect(mockRequireRole).toHaveBeenCalledWith();
  });

  it("400s for a missing message without calling the service", async () => {
    mockRequireRole.mockResolvedValue(buyerSession);

    const res = await POST(request({ propertyId: "property-1" }));
    expect(res.status).toBe(400);
    expect(mockCreateEnquiry).not.toHaveBeenCalled();
  });

  it("400s for a too-short message", async () => {
    mockRequireRole.mockResolvedValue(buyerSession);

    const res = await POST(request({ propertyId: "property-1", message: "hi" }));
    expect(res.status).toBe(400);
    expect(mockCreateEnquiry).not.toHaveBeenCalled();
  });

  it("400s for unparsable JSON", async () => {
    mockRequireRole.mockResolvedValue(buyerSession);

    const res = await POST(
      new Request("http://localhost/api/enquiries", { method: "POST", body: "not json" }),
    );
    expect(res.status).toBe(400);
  });

  it("creates the enquiry and returns 201 on a valid request", async () => {
    mockRequireRole.mockResolvedValue(buyerSession);
    mockCreateEnquiry.mockResolvedValue({ id: "enquiry-1" } as never);

    const res = await POST(request(validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("enquiry-1");
    expect(mockCreateEnquiry).toHaveBeenCalledWith({
      userId: "buyer-1",
      propertyId: "property-1",
      message: validBody.message,
      contactPhone: undefined,
    });
  });

  it("passes contactPhone through when provided", async () => {
    mockRequireRole.mockResolvedValue(buyerSession);
    mockCreateEnquiry.mockResolvedValue({ id: "enquiry-1" } as never);

    await POST(request({ ...validBody, contactPhone: "07700 900123" }));

    expect(mockCreateEnquiry).toHaveBeenCalledWith(
      expect.objectContaining({ contactPhone: "07700 900123" }),
    );
  });

  it("maps a NOT_FOUND service error to HTTP 404", async () => {
    mockRequireRole.mockResolvedValue(buyerSession);
    mockCreateEnquiry.mockRejectedValue(
      new EnquiryServiceError("Listing not found", "NOT_FOUND"),
    );

    const res = await POST(request(validBody));
    expect(res.status).toBe(404);
  });
});
