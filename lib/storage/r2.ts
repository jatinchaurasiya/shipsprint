import "server-only";

import { S3Client, PutObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { serverEnv, optionalEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Cloudflare R2 object storage.
 *
 * The previous implementation decided whether storage was "real" by checking
 * whether the account id or access key contained the substring "placeholder".
 * Configuration is now explicit: `serverEnv()` validates the variables and
 * throws with a message naming what is missing.
 */

let cached: S3Client | null = null;

export function getR2Client(): S3Client {
  if (cached) return cached;

  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = serverEnv();

  cached = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  return cached;
}

/**
 * Uploads a buffer and returns its public URL.
 *
 * Keys use a random UUID rather than `Date.now()`, which is not collision-safe
 * at millisecond resolution and produced predictable, guessable object URLs.
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const r2 = getR2Client();
  const { R2_BUCKET_NAME } = serverEnv();

  const extension = fileName.includes(".")
    ? `.${fileName.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")}`
    : "";
  const key = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  const publicDomain = optionalEnv().R2_PUBLIC_DOMAIN;
  if (publicDomain && process.env.NODE_ENV === "production") {
    return `https://${publicDomain.replace(/\/$/, "")}/${key}`;
  }

  return `/${key}`;
}

/**
 * Deletes objects belonging to a site.
 *
 * Deleting a site previously removed only the database row, orphaning every
 * uploaded object in the bucket indefinitely.
 */
export async function deleteFromR2(urls: string[]): Promise<number> {
  if (urls.length === 0) return 0;

  const { R2_BUCKET_NAME } = serverEnv();
  const r2 = getR2Client();

  const keys = urls
    .map((url) => {
      try {
        const parsed = new URL(url);
        return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
      } catch {
        return null;
      }
    })
    .filter((key): key is string => Boolean(key?.startsWith("uploads/")));

  if (keys.length === 0) return 0;

  let deleted = 0;
  // DeleteObjects accepts at most 1000 keys per request.
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    try {
      await r2.send(
        new DeleteObjectsCommand({
          Bucket: R2_BUCKET_NAME,
          Delete: { Objects: batch.map((Key) => ({ Key })) },
        })
      );
      deleted += batch.length;
    } catch (error) {
      // Storage cleanup is best-effort: a failure here must not block the
      // database delete, or the customer can never remove a site.
      logger.exception("failed to delete R2 objects", error, {
        count: batch.length,
      });
    }
  }

  return deleted;
}
