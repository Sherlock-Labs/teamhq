import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "sitesnap-photos";

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.warn("R2 credentials not set. R2 operations will fail.");
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
});

/**
 * Generate a presigned upload URL for direct client-to-R2 upload.
 * Expires in 5 minutes.
 */
export async function generateUploadUrl(r2Key: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
    ContentType: "image/jpeg",
  });
  return getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
}

/**
 * Generate a presigned download URL for private photo access.
 * Expires in 1 hour.
 */
export async function generateDownloadUrl(r2Key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
}

/**
 * Download an object from R2 as a Buffer.
 * Used for thumbnail generation and comparison image creation.
 */
export async function downloadObject(r2Key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
  });
  const response = await s3.send(command);
  if (!response.Body) {
    throw new Error(`R2 object not found: ${r2Key}`);
  }
  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

/**
 * Upload a Buffer to R2 (used for thumbnail and comparison image uploads).
 */
export async function uploadObject(r2Key: string, body: Buffer, contentType = "image/jpeg"): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
    Body: body,
    ContentType: contentType,
  });
  await s3.send(command);
}

/**
 * Delete a single object from R2.
 */
export async function deleteObject(r2Key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
  });
  await s3.send(command);
}

/**
 * Check if an object exists in R2 without downloading it.
 * Uses a HEAD request which is cheaper than GET.
 * Returns true if the object exists, false otherwise.
 */
export async function objectExists(r2Key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
    });
    await s3.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete all objects under a given prefix (e.g., all photos for a job).
 * Used for job deletion cleanup.
 */
export async function deleteObjectsByPrefix(prefix: string): Promise<number> {
  let deleted = 0;
  let continuationToken: string | undefined;

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const listResponse = await s3.send(listCommand);
    const objects = listResponse.Contents || [];

    for (const obj of objects) {
      if (obj.Key) {
        await deleteObject(obj.Key);
        deleted++;
      }
    }

    continuationToken = listResponse.IsTruncated
      ? listResponse.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return deleted;
}

/**
 * Build the R2 key for an original photo.
 * Pattern: {clerkUserId}/jobs/{jobId}/{photoId}.jpg
 */
export function buildPhotoKey(clerkUserId: string, jobId: string, photoId: string): string {
  return `${clerkUserId}/jobs/${jobId}/${photoId}.jpg`;
}

/**
 * Build the R2 key for a thumbnail.
 * Pattern: {clerkUserId}/jobs/{jobId}/thumbs/{photoId}.jpg
 */
export function buildThumbnailKey(clerkUserId: string, jobId: string, photoId: string): string {
  return `${clerkUserId}/jobs/${jobId}/thumbs/${photoId}.jpg`;
}

/**
 * Build the R2 key for a comparison image.
 * Pattern: {clerkUserId}/jobs/{jobId}/comparisons/{comparisonId}.jpg
 */
export function buildComparisonKey(clerkUserId: string, jobId: string, comparisonId: string): string {
  return `${clerkUserId}/jobs/${jobId}/comparisons/${comparisonId}.jpg`;
}

/**
 * Build the prefix for all objects in a job directory.
 * Used for bulk deletion on job delete.
 */
export function buildJobPrefix(clerkUserId: string, jobId: string): string {
  return `${clerkUserId}/jobs/${jobId}/`;
}
