import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, customerPhone, tableId, hotelId } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: "Invalid push subscription object." },
        { status: 400 }
      );
    }

    let customerId: number | null = null;
    if (customerPhone) {
      const customer = await prisma.customer.findUnique({
        where: { phone: customerPhone.replace(/\s+/g, "") },
      });
      if (customer) customerId = customer.id;
    }

    const numTableId = tableId ? Number(tableId) : null;
    const numHotelId = hotelId ? Number(hotelId) : null;

    // Upsert subscription by endpoint
    const existing = await prisma.pushSubscription.findFirst({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          customerId: customerId ?? existing.customerId,
          tableId: (numTableId && !isNaN(numTableId)) ? numTableId : existing.tableId,
          hotelId: (numHotelId && !isNaN(numHotelId)) ? numHotelId : existing.hotelId,
        },
      });
    } else {
      await prisma.pushSubscription.create({
        data: {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          customerId,
          tableId: (numTableId && !isNaN(numTableId)) ? numTableId : null,
          hotelId: (numHotelId && !isNaN(numHotelId)) ? numHotelId : null,
          userAgent: request.headers.get("user-agent") || null,
        },
      });
    }

    return NextResponse.json({ success: true, message: "Subscribed to push notifications" });
  } catch (error) {
    console.error("API POST /api/push/subscribe error:", error);
    return NextResponse.json(
      { error: "Failed to save push subscription." },
      { status: 500 }
    );
  }
}
