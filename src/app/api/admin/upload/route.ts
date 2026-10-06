import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const dynamic = "force-dynamic";

// Allowed MIME types for dish image uploads
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file format. Please upload JPG, PNG, WEBP, AVIF, or GIF image.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit." },
        { status: 400 }
      );
    }

    // Determine extension
    const extFromName = path.extname(file.name).toLowerCase().replace(".", "");
    let ext = extFromName;
    if (!ext) {
      if (file.type === "image/png") ext = "png";
      else if (file.type === "image/webp") ext = "webp";
      else if (file.type === "image/avif") ext = "avif";
      else if (file.type === "image/gif") ext = "gif";
      else ext = "jpg";
    }

    // Clean base name
    const rawBaseName = path.basename(file.name, path.extname(file.name));
    const cleanBaseName =
      rawBaseName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 30) || "dish";

    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fileName = `${cleanBaseName}-${uniqueSuffix}.${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "menu");
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await fs.writeFile(filePath, buffer);

    // Return both relative URL (starting with /) and the raw fileName
    const relativeUrl = `/uploads/menu/${fileName}`;

    return NextResponse.json({
      success: true,
      fileName,
      url: relativeUrl,
      size: file.size,
      mimeType: file.type,
    });
  } catch (err: unknown) {
    console.error("Image upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload image. Please try again." },
      { status: 500 }
    );
  }
}
