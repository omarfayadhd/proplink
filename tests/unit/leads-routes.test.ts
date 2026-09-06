import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/authz", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/services/enquiries/enquiryService", () => ({ updateEnquiryStatus: vi.fn() }));
vi.mock("@/services/listings/analytics", async (importOriginal) => ({
  // The cookie parse/serialise helpers are pure — keep the real ones so the
  // route's cookie round-trip is genuinely exercised, and mock only the write.
  ...(await importOriginal<typeof import("@/services/listings/analytics")>()),
  recordListingView: vi.fn(),
}));
vi.mock("@/services/listings/savedProperties", () => ({
  saveListing: vi.fn(),
  unsaveListing: vi.fn(),
}));

import { requireRole } from "@/lib/authz";
import { auth } from "@/lib/auth";
import { updateEnquiryStatus } from "@/services/enquiries/enquiryService";
import { EnquiryServiceError } from "@/services/enquiries/errors";
import { ListingServiceError } from "@/services/listings/errors";
import { VIEWED_LISTINGS_COOKIE, recordListingView } from "@/services/listings/analytics";
import { saveListing, unsaveListing } from "@/services/listings/savedProperties";
import { PATCH } from "@/app/api/enquiries/[id]/route";
import { POST as VIEW } from "@/app/api/listings/[id]/view/route";
import { POST as SAVE, DELETE as UNSAVE } from "@/app/api/listings/[id]/save/route";

const mockRequireRole = vi.mocked(requireRole);
const mockAuth = vi.mocked(auth);
const mockUpdateEnquiryStatus = vi.mocked(updateEnquiryStatus);
const mockRecordListingView = vi.mocked(recordListingView);
const mockSaveListing = vi.mocked(saveListing);
const mockUnsaveListing = vi.mocked(unsaveListing);

beforeEach(() => vi.clearAllMocks());

const params = (id: string) => ({ params: Promise.resolve({ id }) });

const agentSession = {
  ok: true as const,
  session: { user: { id: "user-agent-1", role: "AGENT" } } as never,
};
const buyerSession = {
  ok: true as const,
  session: { user: { id: "buyer-1", role: "BUYER" } } as never,
};
const forbidden = {
  ok: false as const,
  response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
};

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/enquiries/enquiry-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/enquiries/[id]", () => {
  it("403s a non-agent without calling the service", async () => {
    mockRequireRole.mockResolvedValue(forbidden);

    const res = await PATCH(patchRequest({ status: "CLOSED" }), params("enquiry-1"));
    expect(res.status).toBe(403);
    expect(mockUpdateEnquiryStatus).not.toHaveBeenCalled();
  });

  it("requires the AGENT role specifically", async () => {
    mockRequireRole.mockResolvedValue(agentSession);
    mockUpdateEnquiryStatus.mockResolvedValue({ id: "enquiry-1" } as never);

    await PATCH(patchRequest({ status: "CLOSED" }), params("enquiry-1"));

    expect(mockRequireRole).toHaveBeenCalledWith("AGENT");
  });

  it("400s an unknown status without calling the service", async () => {
    mockRequireRole.mockResolvedValue(agentSession);

    const res = await PATCH(patchRequest({ status: "ARCHIVED" }), params("enquiry-1"));
    expect(res.status).toBe(400);
    expect(mockUpdateEnquiryStatus).not.toHaveBeenCalled();
  });

  it("400s unparsable JSON", async () => {
    mockRequireRole.mockResolvedValue(agentSession);

    const res = await PATCH(
      new Request("http://localhost/api/enquiries/enquiry-1", {
        method: "PATCH",
        body: "not json",
      }),
      params("enquiry-1"),
    );
    expect(res.status).toBe(400);
  });

  it("updates the status and returns 200", async () => {
    mockRequireRole.mockResolvedValue(agentSession);
    mockUpdateEnquiryStatus.mockResolvedValue({
      id: "enquiry-1",
      status: "RESPONDED",
    } as never);

    const res = await PATCH(patchRequest({ status: "RESPONDED" }), params("enquiry-1"));

    expect(res.status).toBe(200);
    expect(mockUpdateEnquiryStatus).toHaveBeenCalledWith({
      enquiryId: "enquiry-1",
      agentUserId: "user-agent-1",
      status: "RESPONDED",
    });
  });

  it("maps a FORBIDDEN service error to HTTP 403", async () => {
    mockRequireRole.mockResolvedValue(agentSession);
    mockUpdateEnquiryStatus.mockRejectedValue(
      new EnquiryServiceError("This lead belongs to another agency", "FORBIDDEN"),
    );

    const res = await PATCH(patchRequest({ status: "CLOSED" }), params("enquiry-1"));
    expect(res.status).toBe(403);
  });

  it("maps a NOT_FOUND service error to HTTP 404", async () => {
    mockRequireRole.mockResolvedValue(agentSession);
    mockUpdateEnquiryStatus.mockRejectedValue(
      new EnquiryServiceError("Enquiry not found", "NOT_FOUND"),
    );

    const res = await PATCH(patchRequest({ status: "CLOSED" }), params("enquiry-1"));
    expect(res.status).toBe(404);
  });
});

function viewRequest(cookie?: string) {
  return new NextRequest("http://localhost/api/listings/property-1/view", {
    method: "POST",
    ...(cookie ? { headers: { cookie } } : {}),
  });
}

describe("POST /api/listings/[id]/view", () => {
  it("counts an anonymous view and sets the session cookie", async () => {
    mockAuth.mockResolvedValue(null as never);
    mockRecordListingView.mockResolvedValue({
      counted: true,
      viewedIds: ["property-1"],
    });

    const res = await VIEW(viewRequest(), params("property-1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ counted: true });
    const cookie = res.cookies.get(VIEWED_LISTINGS_COOKIE);
    expect(cookie?.value).toBe("property-1");
    expect(cookie?.httpOnly).toBe(true);
    // No maxAge/expires — a true session cookie, which *is* the dedupe window.
    expect(cookie?.maxAge).toBeUndefined();
    expect(cookie?.expires).toBeUndefined();
  });

  it("passes the existing session's viewed ids through to the service", async () => {
    mockAuth.mockResolvedValue(null as never);
    mockRecordListingView.mockResolvedValue({
      counted: false,
      viewedIds: ["property-1", "property-9"],
    });

    await VIEW(
      viewRequest(`${VIEWED_LISTINGS_COOKIE}=property-1,property-9`),
      params("property-1"),
    );

    expect(mockRecordListingView).toHaveBeenCalledWith({
      propertyId: "property-1",
      viewer: null,
      viewedIds: ["property-1", "property-9"],
    });
  });

  it("passes a logged-in viewer's id and role through (owner/admin views must not count)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-agent-1", role: "AGENT" },
    } as never);
    mockRecordListingView.mockResolvedValue({ counted: false, viewedIds: [] });

    await VIEW(viewRequest(), params("property-1"));

    expect(mockRecordListingView).toHaveBeenCalledWith(
      expect.objectContaining({ viewer: { userId: "user-agent-1", role: "AGENT" } }),
    );
  });

  it("does not require a session — a logged-out visitor's view still counts", async () => {
    mockAuth.mockResolvedValue(null as never);
    mockRecordListingView.mockResolvedValue({ counted: true, viewedIds: ["property-1"] });

    const res = await VIEW(viewRequest(), params("property-1"));

    expect(res.status).toBe(200);
    expect(mockRequireRole).not.toHaveBeenCalled();
  });

  it("maps a NOT_FOUND service error to HTTP 404", async () => {
    mockAuth.mockResolvedValue(null as never);
    mockRecordListingView.mockRejectedValue(
      new ListingServiceError("Listing not found", "NOT_FOUND"),
    );

    const res = await VIEW(viewRequest(), params("property-1"));
    expect(res.status).toBe(404);
  });
});

function saveRequest(method: string) {
  return new Request("http://localhost/api/listings/property-1/save", { method });
}

describe("POST/DELETE /api/listings/[id]/save", () => {
  it("saves for a buyer and returns 200", async () => {
    mockRequireRole.mockResolvedValue(buyerSession);
    mockSaveListing.mockResolvedValue(undefined);

    const res = await SAVE(saveRequest("POST"), params("property-1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ saved: true });
    expect(mockSaveListing).toHaveBeenCalledWith({
      userId: "buyer-1",
      propertyId: "property-1",
    });
  });

  // Saving is for people who might buy — an agent saving their own stock, or an
  // admin, has no product meaning and would pollute the saves metric.
  it.each([
    ["POST", SAVE],
    ["DELETE", UNSAVE],
  ])("%s restricts to BUYER and INVESTOR", async (method, handler) => {
    mockRequireRole.mockResolvedValue(forbidden);

    const res = await handler(saveRequest(method), params("property-1"));

    expect(res.status).toBe(403);
    expect(mockRequireRole).toHaveBeenCalledWith("BUYER", "INVESTOR");
    expect(mockSaveListing).not.toHaveBeenCalled();
    expect(mockUnsaveListing).not.toHaveBeenCalled();
  });

  it("unsaves for a buyer and returns 200", async () => {
    mockRequireRole.mockResolvedValue(buyerSession);
    mockUnsaveListing.mockResolvedValue(undefined);

    const res = await UNSAVE(saveRequest("DELETE"), params("property-1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ saved: false });
    expect(mockUnsaveListing).toHaveBeenCalledWith({
      userId: "buyer-1",
      propertyId: "property-1",
    });
  });

  it("maps a NOT_FOUND service error to HTTP 404", async () => {
    mockRequireRole.mockResolvedValue(buyerSession);
    mockSaveListing.mockRejectedValue(
      new ListingServiceError("Listing not found", "NOT_FOUND"),
    );

    const res = await SAVE(saveRequest("POST"), params("property-1"));
    expect(res.status).toBe(404);
  });
});
