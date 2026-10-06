import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderSource } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hotelSlug = searchParams.get("hotel") || "hotel-annapoorna";

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug },
      select: { id: true, name: true, slug: true, currency: true },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    // Ensure configurations exist for SWIGGY and ZOMATO
    let swiggyConfig = await prisma.aggregatorIntegration.findUnique({
      where: {
        hotelId_platform: {
          hotelId: hotel.id,
          platform: OrderSource.SWIGGY,
        },
      },
    });

    if (!swiggyConfig) {
      swiggyConfig = await prisma.aggregatorIntegration.create({
        data: {
          hotelId: hotel.id,
          platform: OrderSource.SWIGGY,
          isEnabled: true,
          storeId: "SWG-ANNAPOORNA-01",
          autoAccept: true,
          prepTime: 20,
        },
      });
    }

    let zomatoConfig = await prisma.aggregatorIntegration.findUnique({
      where: {
        hotelId_platform: {
          hotelId: hotel.id,
          platform: OrderSource.ZOMATO,
        },
      },
    });

    if (!zomatoConfig) {
      zomatoConfig = await prisma.aggregatorIntegration.create({
        data: {
          hotelId: hotel.id,
          platform: OrderSource.ZOMATO,
          isEnabled: true,
          storeId: "ZOM-ANNAPOORNA-01",
          autoAccept: true,
          prepTime: 25,
        },
      });
    }

    // Get today's stats for channels
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [swiggyOrders, zomatoOrders, dineInOrders] = await Promise.all([
      prisma.order.findMany({
        where: {
          hotelId: hotel.id,
          orderSource: OrderSource.SWIGGY,
          createdAt: { gte: todayStart },
        },
        select: { id: true, totalAmount: true, status: true },
      }),
      prisma.order.findMany({
        where: {
          hotelId: hotel.id,
          orderSource: OrderSource.ZOMATO,
          createdAt: { gte: todayStart },
        },
        select: { id: true, totalAmount: true, status: true },
      }),
      prisma.order.findMany({
        where: {
          hotelId: hotel.id,
          orderSource: OrderSource.DINE_IN,
          createdAt: { gte: todayStart },
        },
        select: { id: true, totalAmount: true, status: true },
      }),
    ]);

    const swiggyRevenue = swiggyOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const zomatoRevenue = zomatoOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const dineInRevenue = dineInOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    return NextResponse.json({
      hotel,
      integrations: {
        swiggy: swiggyConfig,
        zomato: zomatoConfig,
      },
      stats: {
        swiggy: {
          count: swiggyOrders.length,
          revenue: Math.round(swiggyRevenue),
          active: swiggyOrders.filter((o) => ["PENDING", "ACCEPTED", "PREPARING", "READY"].includes(o.status)).length,
        },
        zomato: {
          count: zomatoOrders.length,
          revenue: Math.round(zomatoRevenue),
          active: zomatoOrders.filter((o) => ["PENDING", "ACCEPTED", "PREPARING", "READY"].includes(o.status)).length,
        },
        dineIn: {
          count: dineInOrders.length,
          revenue: Math.round(dineInRevenue),
          active: dineInOrders.filter((o) => ["PENDING", "ACCEPTED", "PREPARING", "READY", "SERVED"].includes(o.status)).length,
        },
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/integrations error:", error);
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hotelSlug = "hotel-annapoorna", platform, isEnabled, storeId, autoAccept, prepTime } = body;

    if (!platform || !["SWIGGY", "ZOMATO"].includes(platform)) {
      return NextResponse.json({ error: "Invalid platform. Must be SWIGGY or ZOMATO" }, { status: 400 });
    }

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug },
      select: { id: true },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    const updated = await prisma.aggregatorIntegration.upsert({
      where: {
        hotelId_platform: {
          hotelId: hotel.id,
          platform: platform as OrderSource,
        },
      },
      update: {
        ...(isEnabled !== undefined ? { isEnabled: Boolean(isEnabled) } : {}),
        ...(storeId !== undefined ? { storeId: String(storeId) } : {}),
        ...(autoAccept !== undefined ? { autoAccept: Boolean(autoAccept) } : {}),
        ...(prepTime !== undefined ? { prepTime: Number(prepTime) } : {}),
      },
      create: {
        hotelId: hotel.id,
        platform: platform as OrderSource,
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
        storeId: storeId || `${platform}-STORE-01`,
        autoAccept: autoAccept !== undefined ? Boolean(autoAccept) : true,
        prepTime: Number(prepTime) || 20,
      },
    });

    return NextResponse.json({
      success: true,
      integration: updated,
      message: `${platform} settings successfully updated.`,
    });
  } catch (error: any) {
    console.error("POST /api/admin/integrations error:", error);
    return NextResponse.json({ error: "Failed to update integration settings" }, { status: 500 });
  }
}
