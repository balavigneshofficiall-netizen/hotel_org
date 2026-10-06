import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const LIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.SERVED,
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ hasActiveOrder: false });
    }

    const cleanPhone = phone.replace(/\s+/g, "");
    const digits = phone.replace(/\D/g, "");
    const last10 = digits.slice(-10);
    const normalizedPhone = digits.length === 10 ? `+91${digits}` : `+${digits}`;

    // Find customer by phone
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          { phone: normalizedPhone },
          { phone: { contains: last10 } },
        ],
      },
    });

    if (!customer) {
      return NextResponse.json({ hasActiveOrder: false });
    }

    // Find latest active live order
    const liveOrder = await prisma.order.findFirst({
      where: {
        customerId: customer.id,
        status: { in: LIVE_ORDER_STATUSES },
      },
      include: {
        table: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!liveOrder || !liveOrder.table) {
      return NextResponse.json({ hasActiveOrder: false });
    }

    return NextResponse.json({
      hasActiveOrder: true,
      activeOrder: {
        id: liveOrder.id,
        orderNumber: liveOrder.orderNumber,
        status: liveOrder.status,
        tableId: liveOrder.table.id,
        tableNumber: liveOrder.table.tableNumber,
        tableToken: liveOrder.table.qrCodeToken,
      },
    });
  } catch (error) {
    console.error("API GET /api/customer/active-order error:", error);
    return NextResponse.json({ hasActiveOrder: false, error: "Failed to check active order" }, { status: 500 });
  }
}
