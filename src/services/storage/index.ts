import { MockStorageService } from "@/services/storage/mockStorage";
import { S3StorageService } from "@/services/storage/s3Storage";
import type { StorageService } from "@/services/storage/types";

export type {
  PresignInput,
  PresignedUpload,
  StorageService,
} from "@/services/storage/types";
export { MockStorageService } from "@/services/storage/mockStorage";
export { S3StorageService } from "@/services/storage/s3Storage";

// STORAGE_PROVIDER=mock|s3 (see AGENTS.md / task-2.1 brief). Default: s3 when
// AWS creds + bucket are present, mock otherwise (H1.4/H2.1 — docs/BLOCKERS.md).
function hasAwsCredentials(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET,
  );
}

function createStorageService(): StorageService {
  const provider = process.env.STORAGE_PROVIDER ?? (hasAwsCredentials() ? "s3" : "mock");

  if (provider === "s3") {
    const bucket = process.env.S3_BUCKET;
    const region = process.env.AWS_REGION ?? "eu-west-2";
    if (!bucket) {
      throw new Error(
        "STORAGE_PROVIDER=s3 but S3_BUCKET is not set — see docs/BLOCKERS.md (H1.4)",
      );
    }
    return new S3StorageService(bucket, region, process.env.CLOUDFRONT_URL);
  }

  return new MockStorageService();
}

export const storageService: StorageService = createStorageService();
