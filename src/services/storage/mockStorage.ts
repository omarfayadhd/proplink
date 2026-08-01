import { buildStorageKey } from "@/services/storage/keys";
import type {
  PresignInput,
  PresignedUpload,
  StorageService,
} from "@/services/storage/types";

// H1.4 (AWS) / H2.1 (S3 CORS) are deferred — docs/BLOCKERS.md. This is the
// active provider in local dev: it points the client at the local
// `POST /api/uploads/dev` route, which writes under `public/uploads/dev/` so
// the upload flow works end-to-end without any cloud credentials.
export class MockStorageService implements StorageService {
  async createPresignedUpload(input: PresignInput): Promise<PresignedUpload> {
    const key = buildStorageKey(input.kind, input.contentType);
    return {
      uploadUrl: "/api/uploads/dev",
      fields: { key, contentType: input.contentType, kind: input.kind },
      fileFieldName: "file",
      publicUrl: `/uploads/dev/${key}`,
      key,
    };
  }
}
