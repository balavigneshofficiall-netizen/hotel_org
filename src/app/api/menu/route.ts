import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelSlug = searchParams.get("hotel") || "hotel-annapoorna";
    const tableToken = searchParams.get("table");

    // Fetch hotel
    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug },
      include: {
        tables: true,
      },
    });

    if (!hotel) {
      return NextResponse.json(
        { error: "Restaurant not found or unavailable." },
        { status: 404 }
      );
    }

    // Identify table
    let table = null;
    if (tableToken) {
      table = await prisma.hotelTable.findFirst({
        where: {
          hotelId: hotel.id,
          qrCodeToken: tableToken,
        },
      });
    }

    // Fallback if no table token provided or test mode: pick Table 08 or first table
    if (!table) {
      table =
        (await prisma.hotelTable.findFirst({
          where: { hotelId: hotel.id, tableNumber: "Table 08" },
        })) ||
        (await prisma.hotelTable.findFirst({
          where: { hotelId: hotel.id },
        }));
    }

    // Fetch categories with active products
    const categories = await prisma.category.findMany({
      where: {
        hotelId: hotel.id,
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        products: {
          where: {
            isAvailable: true,
          },
          orderBy: [{ isPopular: "desc" }, { rating: "desc" }],
        },
      },
    });

    // Also fetch all popular products for the "Popular" section
    const popularProducts = await prisma.product.findMany({
      where: {
        hotelId: hotel.id,
        isPopular: true,
        isAvailable: true,
      },
      take: 8,
    });

    // Fetch active announcements for homepage slideshow
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

    // Query active orders to compute seat occupancy per table
    const activeOrders = await prisma.order.findMany({
      where: {
        hotelId: hotel.id,
        status: { in: ["PENDING", "ACCEPTED", "PREPARING", "READY", "SERVED"] },
      },
      select: {
        tableId: true,
        guestCount: true,
      },
    });

    const tableSeatMap = new Map<number, { occupied: number; ordersCount: number }>();
    for (const ord of activeOrders) {
      const cur = tableSeatMap.get(ord.tableId) || { occupied: 0, ordersCount: 0 };
      cur.occupied += ord.guestCount || 1;
      cur.ordersCount += 1;
      tableSeatMap.set(ord.tableId, cur);
    }

    const currentTableStats = table
      ? (tableSeatMap.get(table.id) || { occupied: 0, ordersCount: 0 })
      : { occupied: 0, ordersCount: 0 };

    return NextResponse.json({
      hotel: {
        id: hotel.id,
        name: hotel.name,
        slug: hotel.slug,
        tagline: hotel.tagline,
        description: hotel.description,
        address: hotel.address,
        phone: hotel.phone,
        logoUrl: hotel.logoUrl,
        coverImage: hotel.coverImage,
        currency: hotel.currency,
        taxRate: hotel.taxRate,
        primaryColor: hotel.primaryColor,
        accentColor: hotel.accentColor,
      },
      table: table
        ? {
            id: table.id,
            hotelId: table.hotelId,
            tableNumber: table.tableNumber,
            qrCodeToken: table.qrCodeToken,
            capacity: table.capacity,
            floor: table.floor,
            status: (table.capacity - currentTableStats.occupied <= 0) ? "OCCUPIED" : table.status,
            occupiedSeats: currentTableStats.occupied,
            availableSeats: Math.max(0, table.capacity - currentTableStats.occupied),
            activeOrdersCount: currentTableStats.ordersCount,
          }
        : null,
      availableTables: hotel.tables.map((t) => {
        const stats = tableSeatMap.get(t.id) || { occupied: 0, ordersCount: 0 };
        const cap = t.capacity || 4;
        const avail = Math.max(0, cap - stats.occupied);
        return {
          id: t.id,
          tableNumber: t.tableNumber,
          qrCodeToken: t.qrCodeToken,
          capacity: cap,
          occupiedSeats: stats.occupied,
          availableSeats: avail,
          activeOrdersCount: stats.ordersCount,
          status: avail === 0 ? "OCCUPIED" : t.status,
        };
      }),
      categories,
      popularProducts,
      announcements,
    });
  } catch (error) {
    console.error("API /api/menu error:", error);
    return NextResponse.json(
      { error: "Failed to load restaurant menu." },
      { status: 500 }
    );
  }
}
