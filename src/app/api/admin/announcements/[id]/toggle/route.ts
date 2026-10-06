import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.announcement.findUnique({
      where: { id: Number(id) },
      select: { isActive: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    const updated = await prisma.announcement.update({
      where: { id: Number(id) },
      data: { isActive: !existing.isActive },
    });

    return NextResponse.json({ announcement: updated, success: true });
  } catch (err: unknown) {
    console.error("Admin announcement toggle error:", err);
    return NextResponse.json({ error: "Failed to toggle status" }, { status: 500 });
  }
}
