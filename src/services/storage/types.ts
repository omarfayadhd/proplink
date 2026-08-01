// StorageService — provider-agnostic presigned-upload interface (Task 2.1).
// Two implementations: MockStorageService (local disk, dev default) and
// S3StorageService (real presigned POST + CloudFront, used once H1.4/H2.1 land).
// Selection lives in ./index.ts, driven by STORAGE_PROVIDER / AWS env presence.

export type UploadKind = "image" | "pdf";

export interface PresignInput {
  kind: UploadKind;
  contentType: string;
  sizeBytes: number;
  filename: string;
}

/**
 * Shape mirrors an S3 presigned POST: the client builds a multipart
 * FormData from `fields` (+ the binary under `fileFieldName`) and POSTs it to
 * `uploadUrl`. `publicUrl` is the final URL to persist once the upload
 * succeeds; `key` is the storage object key (useful for logging/cleanup).
 */
export interface PresignedUpload {
  uploadUrl: string;
  fields: Record<string, string>;
  fileFieldName: string;
  publicUrl: string;
  key: string;
}

export interface StorageService {
  createPresignedUpload(input: PresignInput): Promise<PresignedUpload>;
}
