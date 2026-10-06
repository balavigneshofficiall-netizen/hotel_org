import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelSlug = searchParams.get("hotel") || "hotel-annapoorna";

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug },
      select: { id: true },
    });

    if (!hotel) {
      return NextResponse.json({ announcements: [] });
    }

    const announcements = await prisma.announcement.findMany({
      where: {
        hotelId: hotel.id,
        isActive: true,
      },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ announcements });
  } catch (err: unknown) {
    console.error("Error fetching announcements:", err);
    return NextResponse.json({ announcements: [] }, { status: 500 });
  }
}
