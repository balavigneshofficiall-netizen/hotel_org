import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelSlug = searchParams.get("hotel") || "hotel-annapoorna";

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found." }, { status: 404 });
    }

    const orders = await prisma.order.findMany({
      where: {
        hotelId: hotel.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        table: true,
        items: true,
        statusHistory: {
          orderBy: { changedAt: "asc" },
        },
      },
      take: 40,
    });

    return NextResponse.json({ hotel, orders });
  } catch (error) {
    console.error("API GET /api/kitchen error:", error);
    return NextResponse.json(
      { error: "Failed to fetch kitchen orders." },
      { status: 500 }
    );
  }
}
