import { randomUUID } from "node:crypto";
import type { UploadKind } from "@/services/storage/types";

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function extensionForContentType(contentType: string): string {
  return EXTENSION_BY_CONTENT_TYPE[contentType] ?? "bin";
}

export function folderForKind(kind: UploadKind): string {
  return kind === "image" ? "images" : "pdfs";
}

/** Storage key shared by both providers: `<images|pdfs>/<uuid>.<ext>`. */
export function buildStorageKey(kind: UploadKind, contentType: string): string {
  return `${folderForKind(kind)}/${randomUUID()}.${extensionForContentType(contentType)}`;
}

/** Matches exactly what buildStorageKey produces — used to reject tampered keys. */
export const STORAGE_KEY_PATTERN =
  /^(images|pdfs)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/;
