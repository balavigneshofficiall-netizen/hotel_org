import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus, PaymentMethod } from "@prisma/client";
import { notifyOrderStatusChange } from "@/lib/events";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const numId = Number(id);
    const session = await prisma.session.findFirst({
      where: {
        OR: [
          ...(isNaN(numId) ? [] : [{ id: numId }]),
          { sessionCode: id },
        ],
      },
      include: {
        hotel: true,
        table: true,
        customer: true,
        orders: {
          include: {
            items: true,
            statusHistory: {
              orderBy: { changedAt: "asc" },
            },
            notifications: {
              orderBy: { sentAt: "desc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    // Calculate combined totals across non-cancelled orders only
    const validOrders = session.orders.filter(
      (o) => o.status !== OrderStatus.CANCELLED
    );
    const combinedSubtotal = validOrders.reduce((sum, o) => sum + o.subtotal, 0);
    const combinedTaxAmount = validOrders.reduce((sum, o) => sum + o.taxAmount, 0);
    const combinedTotal = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Combine items from non-cancelled orders only (excluding cancelled items)
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
        orderId: { in: session.orders.map((o) => o.id) },
      },
      include: { payments: true },
    });

    return NextResponse.json({
      session,
      combined: {
        subtotal: combinedSubtotal,
        taxAmount: combinedTaxAmount,
        totalAmount: combinedTotal,
        itemCount: allItems.length,
        orderCount: validOrders.length,
      },
      allItems,
      bill: sessionBill,
    });
  } catch (error) {
    console.error("API GET /api/sessions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch session." },
      { status: 500 }
    );
  }
}

// Close a session and generate combined bill
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, paymentMethod } = body; // "close", "CASH" | "UPI" | "CARD"

    const numId = Number(id);
    const session = await prisma.session.findFirst({
      where: {
        OR: [
          ...(isNaN(numId) ? [] : [{ id: numId }]),
          { sessionCode: id },
        ],
      },
      include: {
        orders: {
          include: {
            items: true,
            table: true,
          },
        },
        table: true,
        hotel: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    if (action === "request_bill") {
      // Rule: Can only complete bill if all active orders have been SERVED
      const unservedOrders = session.orders.filter(
        (o) =>
          o.status !== OrderStatus.CANCELLED &&
          o.status !== OrderStatus.SERVED &&
          o.status !== OrderStatus.COMPLETED
      );

      if (unservedOrders.length > 0) {
        return NextResponse.json(
          {
            error:
              "Cannot request complete bill while dishes are being prepared. All active orders must be marked as Served first.",
          },
          { status: 400 }
        );
      }

      const updatedSession = await prisma.session.update({
        where: { id: session.id },
        data: {
          billRequested: true,
          billRequestedAt: new Date(),
        },
        include: {
          orders: {
            include: {
              items: true,
              bill: true,
            },
          },
          table: true,
          hotel: true,
        },
      });

      // Notify SSE and Admin that customer has requested bill and is walking to counter
      for (const order of session.orders) {
        notifyOrderStatusChange({
          orderId: order.id,
          orderNumber: order.orderNumber,
          hotelId: session.hotelId,
          tableNumber: session.table.tableNumber,
          status: order.status,
          timestamp: new Date().toISOString(),
          note: `Customer at ${session.table.tableNumber} requested final bill (${session.sessionCode}). Proceeding to billing counter.`,
        });
      }

      return NextResponse.json({
        success: true,
        session: updatedSession,
        message: "Bill requested. Please proceed to billing counter.",
      });
    }

    if (action === "close") {
      const uncompletedOrders = session.orders.filter(
        (o) => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED
      );
      if (!session.isActive && uncompletedOrders.length === 0) {
        return NextResponse.json({
          success: true,
          session,
          message: "Session is already settled and closed.",
        });
      }

      const method =
        paymentMethod === "UPI"
          ? PaymentMethod.UPI
          : paymentMethod === "CARD"
            ? PaymentMethod.CARD
            : PaymentMethod.CASH;

      // Calculate combined totals for non-cancelled orders in the session bill
      const validOrders = session.orders.filter(
        (o) => o.status !== OrderStatus.CANCELLED
      );
      const combinedSubtotal = validOrders.reduce((sum, o) => sum + o.subtotal, 0);
      const combinedTaxAmount = validOrders.reduce((sum, o) => sum + o.taxAmount, 0);
      const combinedDiscount = validOrders.reduce((sum, o) => sum + o.discountAmount, 0);
      const combinedTotal = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const primaryOrder = validOrders[0] || session.orders[0];
      const billNumber = `BILL-${new Date().getFullYear()}-${session.sessionCode.replace("SES-", "S")}`;

      // Ensure every valid (non-cancelled) order in session has a recorded bill with paymentMethod
      for (const order of validOrders) {
        const existingOrderBill = await prisma.bill.findUnique({
          where: { orderId: order.id },
        });

        if (!existingOrderBill) {
          const uniqueBillNumber = `BILL-${new Date().getFullYear()}-${session.sessionCode.replace("SES-", "S")}-${order.orderNumber.replace(/\D/g, "")}`;
          await prisma.bill.create({
            data: {
              orderId: order.id,
              hotelId: session.hotelId,
              billNumber: uniqueBillNumber,
              subtotal: order.subtotal,
              taxAmount: order.taxAmount,
              discountAmount: order.discountAmount,
              grandTotal: order.totalAmount,
              paymentStatus: PaymentStatus.PAID,
              paymentMethod: method,
              paidAt: new Date(),
            },
          });
        } else {
          await prisma.bill.update({
            where: { id: existingOrderBill.id },
            data: {
              subtotal: order.subtotal,
              taxAmount: order.taxAmount,
              discountAmount: order.discountAmount,
              grandTotal: order.totalAmount,
              paymentStatus: PaymentStatus.PAID,
              paymentMethod: method,
              paidAt: new Date(),
            },
          });
        }
      }

      // Mark all non-cancelled orders in the session as COMPLETED and notify
      for (const order of validOrders) {
        if (order.status !== OrderStatus.COMPLETED) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.COMPLETED,
              statusHistory: {
                create: {
                  status: OrderStatus.COMPLETED,
                  note: "Session closed — bill settled",
                },
              },
            },
          });
        }

        // Notify SSE only for valid, completed orders
        notifyOrderStatusChange({
          orderId: order.id,
          orderNumber: order.orderNumber,
          hotelId: session.hotelId,
          tableNumber: session.table.tableNumber,
          status: OrderStatus.COMPLETED,
          timestamp: new Date().toISOString(),
          note: "Bill settled — Thank you for dining with us!",
        });
      }

      // Close the session
      const updatedSession = await prisma.session.update({
        where: { id: session.id },
        data: {
          isActive: false,
          closedAt: new Date(),
        },
        include: {
          orders: {
            include: {
              items: true,
              bill: true,
            },
          },
          table: true,
          hotel: true,
        },
      });

      return NextResponse.json({
        success: true,
        session: updatedSession,
        message: "Session closed and bills generated.",
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("API PATCH /api/sessions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update session." },
      { status: 500 }
    );
  }
}
