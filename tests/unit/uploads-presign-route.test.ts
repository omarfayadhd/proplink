import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/authz", () => ({ requireRole: vi.fn() }));
vi.mock("@/services/storage", () => ({
  storageService: { createPresignedUpload: vi.fn() },
}));

import { requireRole } from "@/lib/authz";
import { storageService } from "@/services/storage";
import { POST } from "@/app/api/uploads/presign/route";

const mockRequireRole = vi.mocked(requireRole);
const mockCreatePresignedUpload = vi.mocked(storageService.createPresignedUpload);

function request(body: unknown) {
  return new Request("http://localhost/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  kind: "image",
  contentType: "image/jpeg",
  sizeBytes: 1024,
  filename: "kitchen.jpg",
};

beforeEach(() => vi.clearAllMocks());

describe("POST /api/uploads/presign", () => {
  it("returns 401 when unauthenticated", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await POST(request(validBody));
    expect(res.status).toBe(401);
    expect(mockCreatePresignedUpload).not.toHaveBeenCalled();
  });

  it("returns 403 for a role other than AGENT/ADMIN", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const res = await POST(request(validBody));
    expect(res.status).toBe(403);
    expect(mockCreatePresignedUpload).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body without calling the storage service", async () => {
    mockRequireRole.mockResolvedValue({
      ok: true,
      session: { user: { id: "u1", role: "AGENT" } } as never,
    });

    const res = await POST(request({ ...validBody, contentType: "image/gif" }));
    expect(res.status).toBe(400);
    expect(mockCreatePresignedUpload).not.toHaveBeenCalled();
  });

  it("returns 200 with the presigned payload for a valid request", async () => {
    mockRequireRole.mockResolvedValue({
      ok: true,
      session: { user: { id: "u1", role: "AGENT" } } as never,
    });
    mockCreatePresignedUpload.mockResolvedValue({
      uploadUrl: "/api/uploads/dev",
      fields: { key: "images/abc.jpg", contentType: "image/jpeg", kind: "image" },
      fileFieldName: "file",
      publicUrl: "/uploads/dev/images/abc.jpg",
      key: "images/abc.jpg",
    });

    const res = await POST(request(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.publicUrl).toBe("/uploads/dev/images/abc.jpg");
    expect(mockRequireRole).toHaveBeenCalledWith("AGENT", "ADMIN");
    expect(mockCreatePresignedUpload).toHaveBeenCalledWith(validBody);
  });
});
