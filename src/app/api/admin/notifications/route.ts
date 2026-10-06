import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getNotificationTemplates,
  saveNotificationTemplates,
} from "@/lib/notificationTemplates.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hotelSlug = searchParams.get("hotel") || "hotel-annapoorna";

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        whatsappMode: true,
        whatsappNumber: true,
        whatsappPhoneId: true,
        whatsappBusinessId: true,
        whatsappAccessToken: true,
        notificationSound: true,
      },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    const limit = Math.min(Number(searchParams.get("limit")) || 1000, 2000);

    // Fetch recent notifications sent to customers
    const recentSent = await prisma.notification.findMany({
      take: limit,
      orderBy: { sentAt: "desc" },
      include: {
        order: {
          select: {
            orderNumber: true,
            customerName: true,
            customerPhone: true,
            status: true,
            totalAmount: true,
            table: {
              select: {
                tableNumber: true,
              },
            },
          },
        },
      },
    });

    // Compute stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await prisma.notification.count({
      where: {
        sentAt: { gte: today },
      },
    });

    const totalCount = await prisma.notification.count();

    // Load custom editable templates
    const templates = getNotificationTemplates();

    // Default whatsappMode to PAID or DISABLED (FREE is converted to PAID)
    const currentMode =
      hotel.whatsappMode === "DISABLED" ? "DISABLED" : "PAID";

    return NextResponse.json({
      hotel: {
        id: hotel.id,
        name: hotel.name,
        slug: hotel.slug,
        whatsappMode: currentMode,
        whatsappNumber: hotel.whatsappNumber || "",
        whatsappPhoneId: hotel.whatsappPhoneId || "",
        whatsappBusinessId: hotel.whatsappBusinessId || "",
        hasAccessToken: Boolean(hotel.whatsappAccessToken),
        notificationSound: hotel.notificationSound || "chime",
      },
      templates,
      stats: {
        totalSent: totalCount,
        todaySent: todayCount,
      },
      recentSent: recentSent.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        sentAt: n.sentAt.toISOString(),
        orderNumber: n.order?.orderNumber || null,
        customerName: n.order?.customerName || "Customer",
        customerPhone: n.order?.customerPhone || "",
        tableNumber: n.order?.table?.tableNumber || "-",
        orderStatus: n.order?.status || null,
        totalAmount: n.order?.totalAmount || null,
      })),
    });
  } catch (err: unknown) {
    console.error("Admin notifications get error:", err);
    return NextResponse.json(
      { error: "Failed to load notification settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      hotelId,
      whatsappMode,
      whatsappNumber,
      whatsappPhoneId,
      whatsappAccessToken,
      whatsappBusinessId,
      templates,
    } = body;

    if (!hotelId) {
      return NextResponse.json({ error: "hotelId is required" }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (whatsappMode !== undefined) {
      dataToUpdate.whatsappMode = whatsappMode === "DISABLED" ? "DISABLED" : "PAID";
    }
    if (whatsappNumber !== undefined) dataToUpdate.whatsappNumber = whatsappNumber;
    if (whatsappPhoneId !== undefined) dataToUpdate.whatsappPhoneId = whatsappPhoneId;
    if (whatsappBusinessId !== undefined) dataToUpdate.whatsappBusinessId = whatsappBusinessId;
    if (whatsappAccessToken !== undefined && whatsappAccessToken !== "") {
      dataToUpdate.whatsappAccessToken = whatsappAccessToken;
    }

    const updated = await prisma.hotel.update({
      where: { id: Number(hotelId) },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        whatsappMode: true,
        whatsappNumber: true,
        whatsappPhoneId: true,
        whatsappBusinessId: true,
        whatsappAccessToken: true,
      },
    });

    let updatedTemplates = null;
    if (templates && typeof templates === "object") {
      updatedTemplates = saveNotificationTemplates(templates);
    } else {
      updatedTemplates = getNotificationTemplates();
    }

    return NextResponse.json({
      success: true,
      hotel: {
        id: updated.id,
        name: updated.name,
        whatsappMode: updated.whatsappMode === "DISABLED" ? "DISABLED" : "PAID",
        whatsappNumber: updated.whatsappNumber || "",
        whatsappPhoneId: updated.whatsappPhoneId || "",
        whatsappBusinessId: updated.whatsappBusinessId || "",
        hasAccessToken: Boolean(updated.whatsappAccessToken),
      },
      templates: updatedTemplates,
    });
  } catch (err: unknown) {
    console.error("Admin notifications patch error:", err);
    return NextResponse.json(
      { error: "Failed to update notification settings" },
      { status: 500 }
    );
  }
}
