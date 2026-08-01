import { describe, expect, it } from "vitest";
import { MockStorageService } from "@/services/storage/mockStorage";

describe("MockStorageService", () => {
  const service = new MockStorageService();

  it("returns a presigned-POST-shaped payload pointing at the local dev upload route", async () => {
    const result = await service.createPresignedUpload({
      kind: "image",
      contentType: "image/jpeg",
      sizeBytes: 2048,
      filename: "kitchen.jpg",
    });

    expect(result.uploadUrl).toBe("/api/uploads/dev");
    expect(result.fileFieldName).toBe("file");
    expect(result.fields.key).toMatch(/^images\/[0-9a-f-]+\.jpg$/);
    expect(result.fields.contentType).toBe("image/jpeg");
    expect(result.fields.kind).toBe("image");
    expect(result.key).toBe(result.fields.key);
    expect(result.publicUrl).toBe(`/uploads/dev/${result.fields.key}`);
  });

  it("routes pdfs into a pdfs/ prefix with a .pdf extension", async () => {
    const result = await service.createPresignedUpload({
      kind: "pdf",
      contentType: "application/pdf",
      sizeBytes: 4096,
      filename: "epc.pdf",
    });

    expect(result.key).toMatch(/^pdfs\/[0-9a-f-]+\.pdf$/);
    expect(result.publicUrl).toBe(`/uploads/dev/${result.key}`);
  });

  it("generates a unique key per call", async () => {
    const a = await service.createPresignedUpload({
      kind: "image",
      contentType: "image/png",
      sizeBytes: 10,
      filename: "a.png",
    });
    const b = await service.createPresignedUpload({
      kind: "image",
      contentType: "image/png",
      sizeBytes: 10,
      filename: "b.png",
    });
    expect(a.key).not.toBe(b.key);
  });
});
