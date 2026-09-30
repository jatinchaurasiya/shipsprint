import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadToR2 } from "@/lib/storage/r2";
import { isDevelopment } from "@/lib/env";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { clientKey } from "@/lib/request";

/**
 * Image upload for logos and screenshots.
 *
 * Three defects in the previous version:
 *   1. `image/svg+xml` was allow-listed. SVG is an active document format that
 *      can carry <script> and event handlers; the R2 bucket is public and the
 *      URL is shown in the editor, so opening it directly executes the script.
 *   2. When R2 was unconfigured it returned a base64 data URL. That value was
 *      then persisted into `sites.content` jsonb on the next save, putting
 *      multi-megabyte strings in the database and in the RSC payload.
 *   3. There was no rate limit, so a single account could claim unbounded
 *      storage.
 */

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Raster formats only. SVG is deliberately excluded — see above.
 *
 * The browser-supplied MIME type is advisory, so these bytes are also checked
 * against their magic numbers below.
 */
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

const MAGIC_BYTES: Record<string, number[][]> = {
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38],
    [0x47, 0x49, 0x46, 0x37],
  ],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // "RIFF"
};

function sniffMime(buffer: Buffer): string | null {
  for (const [mime, signatures] of Object.entries(MAGIC_BYTES)) {
    for (const signature of signatures) {
      if (signature.every((byte, index) => buffer[index] === byte)) return mime;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit({
    identifier: user.id,
    bucket: "upload",
    limit: 20,
    windowSeconds: 3600,
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Upload limit reached. Try again later." },
      { status: 429, headers: rateLimitHeaders(limit) }
    );
  }

  // Secondary guard keyed on the caller, so a shared NAT cannot be used to
  // exhaust the account.
  const secondary = await rateLimit({
    identifier: clientKey(request),
    bucket: "upload-ip",
    limit: 60,
    windowSeconds: 3600,
  });
  if (!secondary.success) {
    return NextResponse.json(
      { error: "Too many uploads from this network. Try again later." },
      { status: 429, headers: rateLimitHeaders(secondary) }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File exceeds the 8MB limit." },
      { status: 413 }
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: `Unsupported file type. Allowed: PNG, JPEG, WebP, GIF. SVG is not accepted for security reasons.`,
      },
      { status: 415 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Verify the bytes actually match the declared type. `File.type` is
  // client-supplied and trivially spoofed.
  const sniffed = sniffMime(buffer);
  if (!sniffed) {
    return NextResponse.json(
      { error: "File content is not a recognised image." },
      { status: 415 }
    );
  }

  try {
    const url = await uploadToR2(buffer, file.name, sniffed);
    return NextResponse.json({ url });
  } catch (error) {
    // The previous version silently substituted a base64 data URL here, which
    // ended up persisted inside sites.content. A failed upload is an error.
    logger.exception("upload failed", error, { user_id: user.id });

    if (isDevelopment()) {
      return NextResponse.json(
        {
          error:
            "Object storage is not configured. Set the R2_* variables in .env.local.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 503 }
    );
  }
}
