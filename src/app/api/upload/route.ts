import { NextRequest, NextResponse } from "next/server";

// POST /api/upload — Upload a file to Vercel Blob (or fallback to base64 data URL for dev)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (60 MB max)
    const MAX_SIZE = 60 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 60 MB)" },
        { status: 400 },
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed` },
        { status: 400 },
      );
    }

    // Try Vercel Blob first
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (blobToken) {
      try {
        const { put } = await import("@vercel/blob");
        const filename = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const blob = await put(filename, file, {
          access: "public",
          contentType: file.type,
        });
        return NextResponse.json({
          url: blob.url,
          type: file.type.startsWith("video/") ? "video" : "image",
        });
      } catch (blobError: any) {
        console.error("Vercel Blob upload failed:", blobError.message);
        // Fall through to base64 fallback
      }
    }

    // Fallback: Convert to base64 data URL (for dev / no blob token)
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Warn if the base64 is very large (over 5 MB)
    if (dataUrl.length > 5 * 1024 * 1024) {
      console.warn(
        "⚠️ Large base64 data URL generated. Set BLOB_READ_WRITE_TOKEN for Vercel Blob storage.",
      );
    }

    return NextResponse.json({
      url: dataUrl,
      type: file.type.startsWith("video/") ? "video" : "image",
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 },
    );
  }
}
