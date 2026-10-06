import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { text, badge, icon, theme, linkUrl, sortOrder, isActive } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Announcement text is required" }, { status: 400 });
    }

    const updated = await prisma.announcement.update({
      where: { id: Number(id) },
      data: {
        text: text.trim(),
        badge: badge !== undefined ? badge?.trim() || null : undefined,
        icon: icon !== undefined ? icon?.trim() || null : undefined,
        theme: theme || undefined,
        linkUrl: linkUrl !== undefined ? linkUrl?.trim() || null : undefined,
        sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
        isActive: typeof isActive === "boolean" ? isActive : undefined,
      },
    });

    return NextResponse.json({ announcement: updated, success: true });
  } catch (err: unknown) {
    console.error("Admin announcement PUT error:", err);
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.announcement.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true, message: "Announcement deleted" });
  } catch (err: unknown) {
    console.error("Admin announcement DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}
