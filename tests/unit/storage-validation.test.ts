import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  presignRequestSchema,
} from "@/services/storage/validation";

const validImage = {
  kind: "image",
  contentType: "image/jpeg",
  sizeBytes: 1024,
  filename: "front-elevation.jpg",
};

const validPdf = {
  kind: "pdf",
  contentType: "application/pdf",
  sizeBytes: 1024,
  filename: "epc-certificate.pdf",
};

describe("presignRequestSchema", () => {
  it("accepts a valid image request", () => {
    expect(presignRequestSchema.safeParse(validImage).success).toBe(true);
  });

  it("accepts a valid pdf request", () => {
    expect(presignRequestSchema.safeParse(validPdf).success).toBe(true);
  });

  it.each(["image/jpeg", "image/png", "image/webp"])(
    "allows image content-type %s",
    (contentType) => {
      expect(presignRequestSchema.safeParse({ ...validImage, contentType }).success).toBe(
        true,
      );
    },
  );

  it("rejects a disallowed image content-type", () => {
    const result = presignRequestSchema.safeParse({
      ...validImage,
      contentType: "image/gif",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a pdf content-type declared as kind image", () => {
    const result = presignRequestSchema.safeParse({
      ...validImage,
      contentType: "application/pdf",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an image content-type declared as kind pdf", () => {
    const result = presignRequestSchema.safeParse({
      ...validPdf,
      contentType: "image/jpeg",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an image at exactly the 10MB cap", () => {
    expect(
      presignRequestSchema.safeParse({ ...validImage, sizeBytes: MAX_IMAGE_BYTES })
        .success,
    ).toBe(true);
  });

  it("rejects an image over the 10MB cap", () => {
    const result = presignRequestSchema.safeParse({
      ...validImage,
      sizeBytes: MAX_IMAGE_BYTES + 1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a pdf at exactly the 20MB cap", () => {
    expect(
      presignRequestSchema.safeParse({ ...validPdf, sizeBytes: MAX_PDF_BYTES }).success,
    ).toBe(true);
  });

  it("rejects a pdf over the 20MB cap", () => {
    const result = presignRequestSchema.safeParse({
      ...validPdf,
      sizeBytes: MAX_PDF_BYTES + 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown kind", () => {
    expect(presignRequestSchema.safeParse({ ...validImage, kind: "video" }).success).toBe(
      false,
    );
  });

  it("rejects a missing filename", () => {
    expect(presignRequestSchema.safeParse({ ...validImage, filename: "" }).success).toBe(
      false,
    );
  });

  it("rejects a non-positive sizeBytes", () => {
    expect(presignRequestSchema.safeParse({ ...validImage, sizeBytes: 0 }).success).toBe(
      false,
    );
  });

  it("rejects a non-integer sizeBytes", () => {
    expect(
      presignRequestSchema.safeParse({ ...validImage, sizeBytes: 10.5 }).success,
    ).toBe(false);
  });
});
