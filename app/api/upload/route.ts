import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadToR2, getR2Client } from "@/lib/storage/r2";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided in form data." },
        { status: 400 }
      );
    }

    // Validate mime type
    const validMimes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/svg+xml",
      "image/gif",
    ];

    if (!validMimes.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type "${file.type}". Allowed types: PNG, JPEG, WebP, SVG, GIF.`,
        },
        { status: 400 }
      );
    }

    // Limit to 10MB
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: "File exceeds maximum size limit of 10MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const r2Client = getR2Client();

    if (r2Client) {
      // Upload directly to Cloudflare R2
      const url = await uploadToR2(buffer, file.name, file.type);
      return NextResponse.json({ url });
    } else {
      // Cloudflare R2 not yet configured in .env.local:
      // Return a base64 Data URL so user can immediately preview their assets in the editor without blockers!
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;

      return NextResponse.json({
        url: dataUrl,
        warning:
          "R2 credentials not detected in .env.local; stored as local preview. Configure R2 credentials for permanent CDN URLs.",
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error during upload" },
      { status: 500 }
    );
  }
}
