import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { buildStorageKey } from "@/services/storage/keys";
import { maxBytesForKind } from "@/services/storage/validation";
import type {
  PresignInput,
  PresignedUpload,
  StorageService,
} from "@/services/storage/types";

const PRESIGN_EXPIRY_SECONDS = 300; // 5 minutes — plenty for an immediate upload

/**
 * Real S3 provider (H1.4 AWS + H2.1 CORS — docs/BLOCKERS.md). Not exercised by
 * unit tests: constructing an S3Client resolves AWS credentials, which would
 * either need real credentials or reach out to the network — tests only cover
 * MockStorageService. Selected automatically once AWS env vars are present
 * (see ./index.ts), or forced with STORAGE_PROVIDER=s3.
 */
export class S3StorageService implements StorageService {
  private client: S3Client;

  constructor(
    private bucket: string,
    region: string,
    private cloudfrontUrl?: string,
  ) {
    this.client = new S3Client({ region });
  }

  async createPresignedUpload(input: PresignInput): Promise<PresignedUpload> {
    const key = buildStorageKey(input.kind, input.contentType);
    const maxBytes = maxBytesForKind(input.kind);

    const { url, fields } = await createPresignedPost(this.client, {
      Bucket: this.bucket,
      Key: key,
      Conditions: [
        ["content-length-range", 0, maxBytes],
        ["eq", "$Content-Type", input.contentType],
      ],
      Fields: { "Content-Type": input.contentType },
      Expires: PRESIGN_EXPIRY_SECONDS,
    });

    const publicUrl = this.cloudfrontUrl
      ? `${this.cloudfrontUrl.replace(/\/$/, "")}/${key}`
      : `${url.replace(/\/$/, "")}/${key}`; // fallback: direct bucket URL, no CDN configured

    return { uploadUrl: url, fields, fileFieldName: "file", publicUrl, key };
  }
}
