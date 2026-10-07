import { type NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client } from "@/lib/storage/r2";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Public Asset Delivery Route Handler for R2 Object Storage
 *
 * Serves uploaded screenshots, logos, and visuals stored in Cloudflare R2:
 * 1. Works whether requested on localhost:3000, shipsprint.site, or assets.shipsprint.site.
 * 2. Provides HTTP streaming directly from R2 without buffering the entire image into memory.
 * 3. Applies immutable caching (1 year) and CORS allow-all headers so custom domains can embed assets.
 * 4. Supports conditional GET (304 Not Modified) via ETag.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  if (!path || path.length === 0) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Safety: Prevent path traversal
  const hasInvalidSegment = path.some(
    (segment) =>
      segment === ".." ||
      segment === "." ||
      segment.includes("/") ||
      segment.includes("\\") ||
      segment.trim().length === 0
  );

  if (hasInvalidSegment) {
    return new NextResponse("Invalid Path", { status: 400 });
  }

  const key = `uploads/${path.join("/")}`;

  try {
    const bucketName = process.env.R2_BUCKET_NAME || serverEnv().R2_BUCKET_NAME;
    const r2 = getR2Client();

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const s3Response = await r2.send(command);

    if (!s3Response.Body) {
      return new NextResponse("Asset empty", { status: 404 });
    }

    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && s3Response.ETag && ifNoneMatch === s3Response.ETag) {
      return new NextResponse(null, { status: 304 });
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      s3Response.ContentType || "application/octet-stream"
    );
    if (s3Response.ContentLength) {
      headers.set("Content-Length", s3Response.ContentLength.toString());
    }
    if (s3Response.ETag) {
      headers.set("ETag", s3Response.ETag);
    }
    headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
    // Allow any domain (editor, preview, custom customer domain) to embed this asset
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

    // Convert AWS SDK stream to Web ReadableStream for high-performance streaming
    const webStream = typeof (s3Response.Body as any).transformToWebStream === "function"
      ? (s3Response.Body as any).transformToWebStream()
      : (s3Response.Body as unknown as ReadableStream);

    return new Response(webStream, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) {
      return new NextResponse("Asset Not Found", { status: 404 });
    }

    logger.exception("Failed to stream asset from R2", error, { key });
    return new NextResponse("Error fetching asset", { status: 500 });
  }
}

export const HEAD = GET;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}
