import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Returns an S3Client instance configured for Cloudflare R2.
 * Returns null if credentials are not configured in environment variables.
 */
export function getR2Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    accountId.includes("placeholder") ||
    accessKeyId.includes("placeholder")
  ) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Uploads a file buffer directly to Cloudflare R2 and returns its public URL.
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const r2 = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!r2 || !bucketName) {
    throw new Error(
      "Cloudflare R2 is not fully configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in your .env.local."
    );
  }

  // Generate clean, timestamped unique key
  const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueKey = `uploads/${Date.now()}-${cleanName}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueKey,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );

  const publicDomain = process.env.R2_PUBLIC_DOMAIN;
  if (publicDomain && !publicDomain.includes("placeholder")) {
    return `${publicDomain.replace(/\/$/, "")}/${uniqueKey}`;
  }

  return `https://${bucketName}.r2.dev/${uniqueKey}`;
}
