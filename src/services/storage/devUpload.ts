import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { STORAGE_KEY_PATTERN } from "@/services/storage/keys";
import {
  allowedContentTypesForKind,
  maxBytesForKind,
} from "@/services/storage/validation";
import type { UploadKind } from "@/services/storage/types";

// Business logic behind POST /api/uploads/dev — the local stand-in for an S3
// bucket accepting MockStorageService's presigned "POST" (Task 2.1;
// STORAGE_PROVIDER=mock while H1.4/H2.1 AWS S3 + CORS are deferred, see
// docs/BLOCKERS.md). Kept out of the route handler per AGENTS.md's thin-routes
// rule. Re-validates everything server-side — never trust fields the client
// echoes back, even in a local mock.

export const DEV_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "dev");

export type DevUploadResult =
  | { ok: true; key: string; publicUrl: string }
  | { ok: false; status: number; error: string };

export async function saveDevUpload(form: FormData): Promise<DevUploadResult> {
  const key = form.get("key");
  const contentType = form.get("contentType");
  const kind = form.get("kind");
  const file = form.get("file");

  if (
    typeof key !== "string" ||
    typeof contentType !== "string" ||
    typeof kind !== "string"
  ) {
    return { ok: false, status: 400, error: "Missing key/contentType/kind field" };
  }
  if (!(file instanceof Blob)) {
    return { ok: false, status: 400, error: "Missing file" };
  }
  if (kind !== "image" && kind !== "pdf") {
    return { ok: false, status: 400, error: "Invalid kind" };
  }
  const uploadKind = kind as UploadKind;

  if (!STORAGE_KEY_PATTERN.test(key)) {
    return { ok: false, status: 400, error: "Invalid storage key" };
  }
  if (!allowedContentTypesForKind(uploadKind).includes(contentType)) {
    return { ok: false, status: 415, error: "Content-type not allowed for this kind" };
  }
  if (file.size > maxBytesForKind(uploadKind)) {
    return { ok: false, status: 413, error: "File exceeds the size limit for this kind" };
  }
  if (file.type && file.type !== contentType) {
    return { ok: false, status: 400, error: "File content-type mismatch" };
  }

  const destination = path.join(DEV_UPLOAD_ROOT, key);
  if (!destination.startsWith(DEV_UPLOAD_ROOT + path.sep)) {
    // Unreachable given STORAGE_KEY_PATTERN above, kept as a hard backstop.
    return { ok: false, status: 400, error: "Invalid storage key" };
  }

  await mkdir(path.dirname(destination), { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(destination, bytes);

  return { ok: true, key, publicUrl: `/uploads/dev/${key}` };
}
