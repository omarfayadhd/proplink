import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/authz", () => ({ requireRole: vi.fn() }));
vi.mock("@/services/agents/agentProfileService", () => ({
  createCaseStudy: vi.fn(),
  updateCaseStudy: vi.fn(),
  deleteCaseStudy: vi.fn(),
}));

import { requireRole } from "@/lib/authz";
import {
  createCaseStudy,
  deleteCaseStudy,
  updateCaseStudy,
} from "@/services/agents/agentProfileService";
import { AgentServiceError } from "@/services/agents/errors";
import { POST } from "@/app/api/case-studies/route";
import { DELETE, PATCH } from "@/app/api/case-studies/[id]/route";

const mockRequireRole = vi.mocked(requireRole);
const mockCreate = vi.mocked(createCaseStudy);
const mockUpdate = vi.mocked(updateCaseStudy);
const mockDelete = vi.mocked(deleteCaseStudy);

const agentSession = {
  ok: true as const,
  session: { user: { id: "agent-user-1", role: "AGENT" } } as never,
};

function ctx(id = "case-study-1") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/case-studies", () => {
  const validBody = {
    agentProfileId: "profile-1",
    title: "Probate semi refurb",
    capexGBP: 45_000_00,
    netMarginGBP: 22_000_00,
    description: "Gutted and re-wired, sold within 4 months.",
  };

  function request(body: unknown) {
    return new Request("http://localhost/api/case-studies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when unauthenticated", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await POST(request(validBody));
    expect(res.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("400s for an invalid body", async () => {
    mockRequireRole.mockResolvedValue(agentSession);

    const res = await POST(request({ ...validBody, capexGBP: -1 }));
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates and returns 201 on success", async () => {
    mockRequireRole.mockResolvedValue(agentSession);
    mockCreate.mockResolvedValue({ id: "case-study-1" } as never);

    const res = await POST(request(validBody));
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith({
      userId: "agent-user-1",
      input: expect.objectContaining({ agentProfileId: "profile-1" }),
    });
  });

  it("maps a FORBIDDEN service error (profile not owned) to HTTP 403", async () => {
    mockRequireRole.mockResolvedValue(agentSession);
    mockCreate.mockRejectedValue(
      new AgentServiceError("You do not own this profile", "FORBIDDEN"),
    );

    const res = await POST(request(validBody));
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/case-studies/[id]", () => {
  function request(body: unknown) {
    return new Request("http://localhost/api/case-studies/case-study-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when unauthenticated", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await PATCH(request({ title: "New title" }), ctx());
    expect(res.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("400s for an invalid partial body", async () => {
    mockRequireRole.mockResolvedValue(agentSession);

    const res = await PATCH(request({ capexGBP: "not-a-number" }), ctx());
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("updates and returns 200 on success", async () => {
    mockRequireRole.mockResolvedValue(agentSession);
    mockUpdate.mockResolvedValue({ id: "case-study-1", title: "New title" } as never);

    const res = await PATCH(request({ title: "New title" }), ctx("case-study-1"));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      userId: "agent-user-1",
      caseStudyId: "case-study-1",
      input: { title: "New title" },
    });
  });

  it("maps a NOT_FOUND service error to HTTP 404", async () => {
    mockRequireRole.mockResolvedValue(agentSession);
    mockUpdate.mockRejectedValue(
      new AgentServiceError("Case study not found", "NOT_FOUND"),
    );

    const res = await PATCH(request({ title: "Updated title" }), ctx());
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/case-studies/[id]", () => {
  function request() {
    return new Request("http://localhost/api/case-studies/case-study-1", {
      method: "DELETE",
    });
  }

  it("returns 401 when unauthenticated", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await DELETE(request(), ctx());
    expect(res.status).toBe(401);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("deletes and returns 200 on success", async () => {
    mockRequireRole.mockResolvedValue(agentSession);
    mockDelete.mockResolvedValue(undefined as never);

    const res = await DELETE(request(), ctx("case-study-1"));
    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith({
      userId: "agent-user-1",
      caseStudyId: "case-study-1",
    });
  });

  it("maps a FORBIDDEN service error (not the owner) to HTTP 403", async () => {
    mockRequireRole.mockResolvedValue(agentSession);
    mockDelete.mockRejectedValue(
      new AgentServiceError("You do not own this case study", "FORBIDDEN"),
    );

    const res = await DELETE(request(), ctx());
    expect(res.status).toBe(403);
  });
});
