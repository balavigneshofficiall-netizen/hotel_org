import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { notifyOrderStatusChange } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hotelSlug = searchParams.get("hotel") || "hotel-annapoorna";
    const query = searchParams.get("q")?.toLowerCase();

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug },
      select: { id: true, currency: true },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    const where: any = { hotelId: hotel.id };
    if (query) {
      where.OR = [
        { billNumber: { contains: query } },
        { order: { orderNumber: { contains: query } } },
        { order: { customerName: { contains: query } } },
        { order: { customerPhone: { contains: query } } },
      ];
    }

    const bills = await prisma.bill.findMany({
      where,
      include: {
        order: {
          include: {
            table: true,
            items: true,
          },
        },
      },
      orderBy: { generatedAt: "desc" },
    });

    return NextResponse.json({ bills, currency: hotel.currency });
  } catch (err: unknown) {
    console.error("Admin bills get error:", err);
    return NextResponse.json({ error: "Failed to load bills" }, { status: 500 });
  }
}

// Admin / Cashier Settle Bill
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { billId, paymentMethod = "CASH" } = body;

    if (!billId) {
      return NextResponse.json({ error: "billId is required" }, { status: 400 });
    }

    const bill = await prisma.bill.findUnique({
      where: { id: Number(billId) },
      include: {
        order: {
          include: { table: true },
        },
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const method: PaymentMethod =
      paymentMethod === "UPI"
        ? PaymentMethod.UPI
        : paymentMethod === "CARD"
        ? PaymentMethod.CARD
        : PaymentMethod.CASH;

    // Update bill
    const updatedBill = await prisma.bill.update({
      where: { id: bill.id },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: method,
        paidAt: new Date(),
      },
    });

    // Create payment entry
    await prisma.payment.create({
      data: {
        billId: bill.id,
        amount: bill.grandTotal,
        paymentMethod: method,
        status: PaymentStatus.PAID,
        paidAt: new Date(),
      },
    });

    // Complete order
    await prisma.order.update({
      where: { id: bill.orderId },
      data: { status: OrderStatus.COMPLETED },
    });

    // If order was part of a session, check if all orders in session are completed, then close session
    if (bill.order.sessionId) {
      const remainingUncompleted = await prisma.order.count({
        where: {
          sessionId: bill.order.sessionId,
          status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] },
        },
      });

      if (remainingUncompleted === 0) {
        await prisma.session.update({
          where: { id: bill.order.sessionId },
          data: {
            isActive: false,
            closedAt: new Date(),
          },
        });
      }
    }

    // Realtime notification
    notifyOrderStatusChange({
      orderId: bill.order.id,
      orderNumber: bill.order.orderNumber,
      hotelId: bill.hotelId,
      tableNumber: bill.order.table?.tableNumber || "Table",
      status: OrderStatus.COMPLETED,
      timestamp: new Date().toISOString(),
      note: `Bill #${bill.billNumber} paid in full via ${method} at counter.`,
    });

    return NextResponse.json({ success: true, bill: updatedBill });
  } catch (err: unknown) {
    console.error("Admin bills PATCH error:", err);
    return NextResponse.json({ error: "Failed to settle bill" }, { status: 500 });
  }
}
