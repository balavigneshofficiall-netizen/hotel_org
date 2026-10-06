import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { notifyOrderStatusChange } from "@/lib/events";
import { sendWebPush } from "@/lib/webpush";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const numId = Number(id);
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          ...(isNaN(numId) ? [] : [{ id: numId }]),
          { orderNumber: id },
        ],
      },
      include: {
        hotel: true,
        table: true,
        items: true,
        session: {
          include: {
            hotel: true,
            table: true,
            orders: {
              include: {
                items: true,
                statusHistory: { orderBy: { changedAt: "asc" } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        statusHistory: {
          orderBy: { changedAt: "asc" },
        },
        notifications: {
          orderBy: { sentAt: "desc" },
        },
        bill: {
          include: { payments: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    let sessionData = null;
    if (order.session) {
      const validOrders = order.session.orders.filter(
        (o) => o.status !== OrderStatus.CANCELLED
      );
      const combinedSubtotal = validOrders.reduce((sum, o) => sum + o.subtotal, 0);
      const combinedTaxAmount = validOrders.reduce((sum, o) => sum + o.taxAmount, 0);
      const combinedTotal = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const allItems = validOrders.flatMap((o) =>
        o.items
          .filter((item) => !item.isCancelled)
          .map((item) => ({
            ...item,
            orderNumber: o.orderNumber,
            orderCreatedAt: o.createdAt,
          }))
      );

      const sessionBill = await prisma.bill.findFirst({
        where: {
          orderId: { in: order.session.orders.map((o) => o.id) },
        },
        include: { payments: true },
        orderBy: { id: "desc" },
      });

      const hasLiveOrders = validOrders.some(
        (o) => o.status !== OrderStatus.COMPLETED
      );

      // If the session has live active orders, do not let an older paid batch bill mark the whole session as paid
      const effectiveBill = hasLiveOrders ? order.bill : (sessionBill || order.bill);
      const effectiveSession = hasLiveOrders
        ? { ...order.session, isActive: true, closedAt: null }
        : order.session;

      sessionData = {
        session: effectiveSession,
        combined: {
          subtotal: combinedSubtotal,
          taxAmount: combinedTaxAmount,
          totalAmount: combinedTotal,
          itemCount: allItems.length,
          orderCount: validOrders.length,
        },
        allItems,
        bill: effectiveBill,
      };
    }

    return NextResponse.json({ order, sessionData });
  } catch (error) {
    console.error("API GET /api/orders/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order details." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, note } = body as { status: OrderStatus; note?: string };

    if (!status || !Object.values(OrderStatus).includes(status)) {
      return NextResponse.json(
        { error: "Invalid order status value." },
        { status: 400 }
      );
    }

    // Fetch existing order by id or orderNumber
    const numId = Number(id);
    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [
          ...(isNaN(numId) ? [] : [{ id: numId }]),
          { orderNumber: id },
        ],
      },
      include: {
        hotel: true,
        table: true,
        customer: {
          include: {
            pushSubscriptions: true,
          },
        },
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Update order status and add to history
    const updatedOrder = await prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        status,
        statusHistory: {
          create: {
            status,
            note:
              note ||
              (status === OrderStatus.ACCEPTED
                ? "Restaurant accepted your order"
                : status === OrderStatus.PREPARING
                  ? "Chef is preparing your dishes"
                  : status === OrderStatus.READY
                    ? "Your order is ready to serve"
                    : status === OrderStatus.SERVED
                      ? "Order delivered to your table"
                      : status === OrderStatus.COMPLETED
                        ? "Order completed. Thank you for dining with us!"
                        : status === OrderStatus.CANCELLED
                          ? "Order was cancelled"
                          : `Order status changed to ${status}`),
          },
        },
      },
      include: {
        hotel: true,
        table: true,
        items: true,
        statusHistory: {
          orderBy: { changedAt: "asc" },
        },
        bill: true,
      },
    });

    // If order is served or completed, mark all active items as served
    if (status === OrderStatus.SERVED || status === OrderStatus.COMPLETED) {
      await prisma.orderItem.updateMany({
        where: { orderId: updatedOrder.id, isCancelled: false },
        data: { isServed: true, servedAt: new Date() },
      });
    }

    // If order is completed, automatically ensure Bill exists
    if (status === OrderStatus.COMPLETED && !updatedOrder.bill) {
      const billNumber = `BILL-${new Date().getFullYear()}-${updatedOrder.orderNumber.replace("ORD", "")}`;
      await prisma.bill.create({
        data: {
          orderId: updatedOrder.id,
          hotelId: updatedOrder.hotelId,
          billNumber,
          subtotal: updatedOrder.subtotal,
          taxAmount: updatedOrder.taxAmount,
          discountAmount: updatedOrder.discountAmount,
          grandTotal: updatedOrder.totalAmount,
          paymentStatus: PaymentStatus.PAID,
        },
      });
    }

    // If order is cancelled and part of a session, recalculate session bill
    if (status === OrderStatus.CANCELLED && existingOrder.sessionId) {
      const session = await prisma.session.findUnique({
        where: { id: existingOrder.sessionId },
        include: { orders: true },
      });
      if (session) {
        const sessionOrderIds = session.orders.map((o) => o.id);
        const existingBill = await prisma.bill.findFirst({
          where: { orderId: { in: sessionOrderIds } },
        });
        if (existingBill) {
          const validOrders = session.orders.filter(
            (o) => o.id !== existingOrder.id && o.status !== OrderStatus.CANCELLED
          );
          const combinedSubtotal = validOrders.reduce((sum, o) => sum + o.subtotal, 0);
          const combinedTax = validOrders.reduce((sum, o) => sum + o.taxAmount, 0);
          const combinedDiscount = validOrders.reduce((sum, o) => sum + o.discountAmount, 0);
          const combinedTotal = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
          await prisma.bill.update({
            where: { id: existingBill.id },
            data: {
              subtotal: combinedSubtotal,
              taxAmount: combinedTax,
              discountAmount: combinedDiscount,
              grandTotal: combinedTotal,
            },
          });
        }
      }
    }

    // Broadcast SSE update
    notifyOrderStatusChange({
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      hotelId: updatedOrder.hotelId,
      tableNumber: updatedOrder.table.tableNumber,
      status,
      timestamp: new Date().toISOString(),
      note: note || undefined,
    });

    // Send Web Push notification if customer has subscriptions
    try {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          OR: [
            { customerId: existingOrder.customerId },
            { tableId: existingOrder.tableId },
          ],
        },
      });

      const statusLabels: Record<OrderStatus, { title: string; body: string }> = {
        PENDING: {
          title: "Order Placed",
          body: `Order #${updatedOrder.orderNumber} has been placed.`,
        },
        ACCEPTED: {
          title: "Order Accepted 👨‍🍳",
          body: `${updatedOrder.hotel.name} accepted your order #${updatedOrder.orderNumber}.`,
        },
        PREPARING: {
          title: "Kitchen is Cooking 🔥",
          body: `Your food for order #${updatedOrder.orderNumber} is now being prepared!`,
        },
        READY: {
          title: "Order Ready! 🍽️",
          body: `Your order #${updatedOrder.orderNumber} is ready to be served at ${updatedOrder.table.tableNumber}.`,
        },
        SERVED: {
          title: "Dishes Served ✨",
          body: `Your delicious food has been served. Enjoy your meal!`,
        },
        COMPLETED: {
          title: "Bill Settled ✓",
          body: `Thank you for dining at ${updatedOrder.hotel.name}. Tap to view your bill.`,
        },
        CANCELLED: {
          title: "Order Cancelled",
          body: `Order #${updatedOrder.orderNumber} was cancelled.`,
        },
      };

      const pushInfo = statusLabels[status];
      if (pushInfo && subscriptions.length > 0) {
        for (const sub of subscriptions) {
          await sendWebPush(
            {
              endpoint: sub.endpoint,
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
            {
              title: pushInfo.title,
              body: pushInfo.body,
              url: `/orders/${updatedOrder.id}`,
            }
          );
        }
      }
    } catch (pushErr) {
      console.error("Error sending push notification:", pushErr);
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("API PATCH /api/orders/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update order status." },
      { status: 500 }
    );
  }
}
