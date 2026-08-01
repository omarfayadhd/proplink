import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/authz", () => ({ requireRole: vi.fn() }));
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

import { requireRole } from "@/lib/authz";
import { mkdir, writeFile } from "node:fs/promises";
import { POST } from "@/app/api/uploads/dev/route";

const mockRequireRole = vi.mocked(requireRole);
const mockWriteFile = vi.mocked(writeFile);
const mockMkdir = vi.mocked(mkdir);

const VALID_KEY = "images/11111111-1111-1111-1111-111111111111.jpg";

function formRequest(fields: Record<string, string>, file?: Blob) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  if (file) form.append("file", file, "upload.jpg");
  return new Request("http://localhost/api/uploads/dev", { method: "POST", body: form });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue({
    ok: true,
    session: { user: { id: "u1", role: "AGENT" } } as never,
  });
});

describe("POST /api/uploads/dev", () => {
  it("returns 401/403 passthrough when requireRole fails", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await POST(
      formRequest(
        { key: VALID_KEY, contentType: "image/jpeg", kind: "image" },
        new Blob(["x"], { type: "image/jpeg" }),
      ),
    );
    expect(res.status).toBe(401);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("rejects a tampered storage key (path traversal attempt)", async () => {
    const res = await POST(
      formRequest(
        { key: "../../etc/passwd", contentType: "image/jpeg", kind: "image" },
        new Blob(["x"], { type: "image/jpeg" }),
      ),
    );
    expect(res.status).toBe(400);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("rejects a content-type not allowed for the declared kind", async () => {
    const res = await POST(
      formRequest(
        { key: VALID_KEY, contentType: "application/pdf", kind: "image" },
        new Blob(["x"], { type: "application/pdf" }),
      ),
    );
    expect(res.status).toBe(415);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("rejects a file over the size cap for its kind", async () => {
    const big = new Blob([new Uint8Array(11 * 1024 * 1024)], { type: "image/jpeg" });
    const res = await POST(
      formRequest({ key: VALID_KEY, contentType: "image/jpeg", kind: "image" }, big),
    );
    expect(res.status).toBe(413);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("rejects a missing file", async () => {
    const res = await POST(
      formRequest({ key: VALID_KEY, contentType: "image/jpeg", kind: "image" }),
    );
    expect(res.status).toBe(400);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("writes the file and returns the public URL for a valid upload", async () => {
    const res = await POST(
      formRequest(
        { key: VALID_KEY, contentType: "image/jpeg", kind: "image" },
        new Blob(["fake-jpeg-bytes"], { type: "image/jpeg" }),
      ),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.publicUrl).toBe(`/uploads/dev/${VALID_KEY}`);
    expect(mockMkdir).toHaveBeenCalledTimes(1);
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    const [writtenPath] = mockWriteFile.mock.calls[0];
    expect(String(writtenPath).endsWith(VALID_KEY)).toBe(true);
  });
});
