import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/authz", () => ({ requireRole: vi.fn() }));
vi.mock("@/services/agents/agentProfileService", () => ({ createAppraisal: vi.fn() }));

import { requireRole } from "@/lib/authz";
import { createAppraisal } from "@/services/agents/agentProfileService";
import { AgentServiceError } from "@/services/agents/errors";
import { POST } from "@/app/api/agents/[id]/appraisals/route";

const mockRequireRole = vi.mocked(requireRole);
const mockCreateAppraisal = vi.mocked(createAppraisal);

function request(body: unknown) {
  return new Request("http://localhost/api/agents/profile-1/appraisals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx(id = "profile-1") {
  return { params: Promise.resolve({ id }) };
}

const investorSession = {
  ok: true as const,
  session: { user: { id: "investor-1", role: "INVESTOR" } } as never,
};

const validBody = { rating: 5, review: "Excellent communication throughout the sale." };

beforeEach(() => vi.clearAllMocks());

describe("POST /api/agents/[id]/appraisals", () => {
  it("returns 401 when unauthenticated", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await POST(request(validBody), ctx());
    expect(res.status).toBe(401);
    expect(mockCreateAppraisal).not.toHaveBeenCalled();
  });

  it("returns 403 for an AGENT/ADMIN role (requireRole gate, before the service even runs)", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const res = await POST(request(validBody), ctx());
    expect(res.status).toBe(403);
    expect(mockCreateAppraisal).not.toHaveBeenCalled();
  });

  it("400s for an invalid body without calling the service", async () => {
    mockRequireRole.mockResolvedValue(investorSession);

    const res = await POST(request({ rating: 7, review: "short but bad rating" }), ctx());
    expect(res.status).toBe(400);
    expect(mockCreateAppraisal).not.toHaveBeenCalled();
  });

  it("400s for unparsable JSON", async () => {
    mockRequireRole.mockResolvedValue(investorSession);

    const res = await POST(
      new Request("http://localhost/api/agents/profile-1/appraisals", {
        method: "POST",
        body: "not json",
      }),
      ctx(),
    );
    expect(res.status).toBe(400);
  });

  it("creates the appraisal and returns 201 on a valid qualified request", async () => {
    mockRequireRole.mockResolvedValue(investorSession);
    mockCreateAppraisal.mockResolvedValue({ id: "appraisal-1" } as never);

    const res = await POST(request(validBody), ctx("profile-1"));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("appraisal-1");
    expect(mockCreateAppraisal).toHaveBeenCalledWith({
      userId: "investor-1",
      role: "INVESTOR",
      agentProfileId: "profile-1",
      rating: 5,
      review: validBody.review,
    });
  });

  it("maps a NOT_QUALIFIED service error to HTTP 403 (server-enforced qualification rule)", async () => {
    mockRequireRole.mockResolvedValue(investorSession);
    mockCreateAppraisal.mockRejectedValue(
      new AgentServiceError("You need a prior enquiry or deal", "NOT_QUALIFIED"),
    );

    const res = await POST(request(validBody), ctx());
    expect(res.status).toBe(403);
  });

  it("maps a DUPLICATE service error to HTTP 409 (one appraisal per user per profile)", async () => {
    mockRequireRole.mockResolvedValue(investorSession);
    mockCreateAppraisal.mockRejectedValue(
      new AgentServiceError("You have already reviewed this agency", "DUPLICATE"),
    );

    const res = await POST(request(validBody), ctx());
    expect(res.status).toBe(409);
  });

  it("maps a NOT_FOUND service error to HTTP 404", async () => {
    mockRequireRole.mockResolvedValue(investorSession);
    mockCreateAppraisal.mockRejectedValue(
      new AgentServiceError("Agent profile not found", "NOT_FOUND"),
    );

    const res = await POST(request(validBody), ctx());
    expect(res.status).toBe(404);
  });
});
