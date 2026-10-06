import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelSlug = searchParams.get("hotel") || "hotel-annapoorna";

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug },
      select: { id: true },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    const announcements = await prisma.announcement.findMany({
      where: { hotelId: hotel.id },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ announcements, hotelId: hotel.id });
  } catch (err: unknown) {
    console.error("Admin announcements GET error:", err);
    return NextResponse.json({ error: "Failed to load announcements" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { hotelId, text, badge, icon, theme, linkUrl, sortOrder, isActive } = body;

    if (!hotelId) {
      const defaultHotel = await prisma.hotel.findFirst({
        where: { slug: "hotel-annapoorna" },
        select: { id: true },
      });
      if (defaultHotel) {
        hotelId = defaultHotel.id;
      } else {
        return NextResponse.json({ error: "hotelId is required" }, { status: 400 });
      }
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Announcement text is required" }, { status: 400 });
    }

    const created = await prisma.announcement.create({
      data: {
        hotelId,
        text: text.trim(),
        badge: badge?.trim() || null,
        icon: icon?.trim() || null,
        theme: theme || "emerald",
        linkUrl: linkUrl?.trim() || null,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({ announcement: created, success: true }, { status: 201 });
  } catch (err: unknown) {
    console.error("Admin announcements POST error:", err);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}

// PATCH — Update single announcement or batch reorder
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Batch reorder support: { reorder: [{ id: 1, sortOrder: 1 }, { id: 2, sortOrder: 2 }] }
    if (Array.isArray(body.reorder)) {
      const updates = body.reorder.map((item: { id: number; sortOrder: number }) =>
        prisma.announcement.update({
          where: { id: Number(item.id) },
          data: { sortOrder: Number(item.sortOrder) },
        })
      );
      await prisma.$transaction(updates);
      return NextResponse.json({ success: true, message: "Reordered successfully" });
    }

    const { id, text, badge, icon, theme, linkUrl, sortOrder, isActive } = body;
    if (!id) {
      return NextResponse.json({ error: "Announcement id is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (text !== undefined) updateData.text = text.trim();
    if (badge !== undefined) updateData.badge = badge?.trim() || null;
    if (icon !== undefined) updateData.icon = icon?.trim() || null;
    if (theme !== undefined) updateData.theme = theme || "emerald";
    if (linkUrl !== undefined) updateData.linkUrl = linkUrl?.trim() || null;
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);
    if (typeof isActive === "boolean") updateData.isActive = isActive;

    const updated = await prisma.announcement.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json({ announcement: updated, success: true });
  } catch (err: unknown) {
    console.error("Admin announcement PATCH error:", err);
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
  }
}

// DELETE — Delete announcement
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Announcement id is required" }, { status: 400 });
    }

    await prisma.announcement.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true, message: "Announcement deleted" });
  } catch (err: unknown) {
    console.error("Admin announcement DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}

