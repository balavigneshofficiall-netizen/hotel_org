import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Customer phone number is required to look up history." },
        { status: 400 }
      );
    }

    const cleanPhone = phone.replace(/\s+/g, "");
    const digits = phone.replace(/\D/g, "");
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;

    const [customer, orders] = await Promise.all([
      prisma.customer.findFirst({
        where: {
          OR: [
            { phone: cleanPhone },
            { phone: { contains: last10 } },
          ],
        },
      }),
      prisma.order.findMany({
        where: {
          OR: [
            { customerPhone: cleanPhone },
            { customerPhone: { contains: last10 } },
          ],
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          hotel: true,
          table: true,
          items: true,
          bill: true,
          session: true,
        },
        take: 60,
      }),
    ]);

    // Group orders into Session-based Bills
    const sessionMap = new Map<string, any>();

    for (const order of orders) {
      const key = order.sessionId ? `session_${order.sessionId}` : `order_${order.id}`;
      const isCancelled = order.status === "CANCELLED";

      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          id: key,
          sessionId: order.sessionId || null,
          sessionCode: order.session?.sessionCode || `ORD-${order.orderNumber}`,
          tableNumber: order.table?.tableNumber || "Dining Table",
          createdAt: order.createdAt,
          closedAt: order.session?.closedAt || (order.bill?.paidAt) || null,
          status:
            order.session?.isActive === false || order.status === "COMPLETED"
              ? "COMPLETED"
              : order.status,
          isCompleted:
            order.session?.isActive === false || order.status === "COMPLETED",
          orderCount: isCancelled ? 0 : 1,
          orderNumbers: [order.orderNumber],
          totalAmount: isCancelled ? 0 : order.totalAmount,
          subtotal: isCancelled ? 0 : order.subtotal,
          taxAmount: isCancelled ? 0 : order.taxAmount,
          totalDishesCount: isCancelled
            ? 0
            : order.items
                .filter((i: any) => !i.isCancelled)
                .reduce((s: number, i: any) => s + i.quantity, 0),
          items: isCancelled
            ? []
            : order.items.map((i: any) => ({
                id: i.id,
                productName: i.productName,
                quantity: i.quantity,
                subtotal: i.subtotal,
                orderNumber: order.orderNumber,
                isCancelled: Boolean(i.isCancelled),
              })),
          billNumber: order.bill?.billNumber || (order.session ? `BILL-${order.session.sessionCode}` : null),
          paymentMethod: order.bill?.paymentMethod || null,
          paymentStatus:
            order.bill?.paymentStatus ||
            (order.status === "COMPLETED" ? "PAID" : "PENDING"),
          primaryOrderId: order.id,
          latestOrderNumber: order.orderNumber,
          hotel: order.hotel,
        });
      } else {
        const group = sessionMap.get(key)!;
        group.orderNumbers.push(order.orderNumber);
        if (!isCancelled) {
          group.orderCount += 1;
          group.totalAmount = Number((group.totalAmount + order.totalAmount).toFixed(2));
          group.subtotal = Number((group.subtotal + order.subtotal).toFixed(2));
          group.taxAmount = Number((group.taxAmount + order.taxAmount).toFixed(2));
          group.totalDishesCount += order.items
            .filter((i: any) => !i.isCancelled)
            .reduce((s: number, i: any) => s + i.quantity, 0);
          group.items.push(
            ...order.items.map((i: any) => ({
              id: i.id,
              productName: i.productName,
              quantity: i.quantity,
              subtotal: i.subtotal,
              orderNumber: order.orderNumber,
              isCancelled: Boolean(i.isCancelled),
            }))
          );
        }
        if (order.bill?.billNumber && !group.billNumber) {
          group.billNumber = order.bill.billNumber;
        }
        if (order.bill?.paymentMethod && !group.paymentMethod) {
          group.paymentMethod = order.bill.paymentMethod;
        }
        if (order.status !== "COMPLETED" && order.status !== "CANCELLED") {
          group.isCompleted = false;
        }
      }
    }

    const sessions = Array.from(sessionMap.values());

    return NextResponse.json({ customer, sessions, orders });
  } catch (error) {
    console.error("API GET /api/history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order history." },
      { status: 500 }
    );
  }
}
