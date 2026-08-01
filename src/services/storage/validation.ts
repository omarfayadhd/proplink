import { z } from "zod";
import type { UploadKind } from "@/services/storage/types";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_PDF_TYPES = ["application/pdf"] as const;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB — sprint plan Task 2.1
export const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20MB — sprint plan Task 2.1

const ALLOWED_CONTENT_TYPES_BY_KIND: Record<UploadKind, readonly string[]> = {
  image: ALLOWED_IMAGE_TYPES,
  pdf: ALLOWED_PDF_TYPES,
};

const MAX_BYTES_BY_KIND: Record<UploadKind, number> = {
  image: MAX_IMAGE_BYTES,
  pdf: MAX_PDF_BYTES,
};

export function allowedContentTypesForKind(kind: UploadKind): readonly string[] {
  return ALLOWED_CONTENT_TYPES_BY_KIND[kind];
}

export function maxBytesForKind(kind: UploadKind): number {
  return MAX_BYTES_BY_KIND[kind];
}

/**
 * Server-side gate for POST /api/uploads/presign (and re-checked by the mock
 * dev upload route as defence-in-depth). Cross-field validation — content-type
 * must belong to the kind's allowlist, size must be under the kind's cap —
 * lives in `superRefine` since neither rule can be expressed per-field alone.
 */
export const presignRequestSchema = z
  .object({
    kind: z.enum(["image", "pdf"]),
    contentType: z.string().trim().min(1, "contentType is required"),
    sizeBytes: z
      .number()
      .int("sizeBytes must be an integer")
      .positive("sizeBytes must be positive"),
    filename: z.string().trim().min(1, "filename is required").max(255),
  })
  .superRefine((data, ctx) => {
    const allowedTypes = allowedContentTypesForKind(data.kind);
    if (!allowedTypes.includes(data.contentType)) {
      ctx.addIssue({
        code: "custom",
        path: ["contentType"],
        message: `${data.kind === "image" ? "Images" : "PDFs"} must be one of: ${allowedTypes.join(", ")}`,
      });
    }

    const maxBytes = maxBytesForKind(data.kind);
    if (data.sizeBytes > maxBytes) {
      ctx.addIssue({
        code: "custom",
        path: ["sizeBytes"],
        message: `${data.kind === "image" ? "Images" : "PDFs"} must be ≤ ${maxBytes / (1024 * 1024)}MB`,
      });
    }
  });

export type PresignRequestInput = z.infer<typeof presignRequestSchema>;
