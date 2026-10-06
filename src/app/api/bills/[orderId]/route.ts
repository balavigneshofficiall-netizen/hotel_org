import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentStatus } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // Find the order by id or orderNumber first
    const numOrderId = Number(orderId);
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          ...(isNaN(numOrderId) ? [] : [{ id: numOrderId }]),
          { orderNumber: orderId },
        ],
      },
      include: {
        items: true,
        table: true,
        hotel: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    let bill = await prisma.bill.findUnique({
      where: { orderId: order.id },
      include: {
        order: {
          include: {
            items: true,
            table: true,
            hotel: true,
          },
        },
        hotel: true,
        payments: true,
      },
    });

    // Check if this order belongs to a session with multiple orders
    let session = null;
    if (order.sessionId) {
      session = await prisma.session.findUnique({
        where: { id: order.sessionId },
        include: {
          orders: {
            include: {
              items: true,
              table: true,
            },
            orderBy: { createdAt: "asc" },
          },
          table: true,
          hotel: true,
        },
      });
    }

    if (session && session.orders.length > 0) {
      // Calculate consolidated totals across non-cancelled orders only
      const validOrders = session.orders.filter((o) => o.status !== "CANCELLED");
      const combinedSubtotal = validOrders.reduce((sum, o) => sum + o.subtotal, 0);
      const combinedTaxAmount = validOrders.reduce((sum, o) => sum + o.taxAmount, 0);
      const combinedDiscount = validOrders.reduce((sum, o) => sum + o.discountAmount, 0);
      const combinedTotal = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      const allItems = validOrders.flatMap((o) =>
        o.items
          .filter((item) => !item.isCancelled)
          .map((item) => ({
            ...item,
            orderNumber: o.orderNumber,
            productName: item.productName,
          }))
      );

      const isAllCompleted =
        !session.isActive ||
        (validOrders.length > 0 && validOrders.every((o) => o.status === "COMPLETED"));
      const sessionOrderIds = session.orders.map((o) => o.id);

      // Search for any existing bill already created for any order in this session
      let sessionBill = await prisma.bill.findFirst({
        where: { orderId: { in: sessionOrderIds } },
        include: {
          order: {
            include: {
              items: true,
              table: true,
              hotel: true,
            },
          },
          hotel: true,
          payments: true,
        },
      });

      const primaryOrder = validOrders[0] || session.orders[0];
      const billNumber = `BILL-${new Date().getFullYear()}-${session.sessionCode.replace("SES-", "S")}`;

      if (!sessionBill) {
        sessionBill = await prisma.bill.create({
          data: {
            orderId: primaryOrder.id,
            hotelId: primaryOrder.hotelId,
            billNumber,
            subtotal: combinedSubtotal,
            taxAmount: combinedTaxAmount,
            discountAmount: combinedDiscount,
            grandTotal: combinedTotal,
            paymentStatus: isAllCompleted ? PaymentStatus.PAID : PaymentStatus.PENDING,
          },
          include: {
            order: {
              include: {
                items: true,
                table: true,
                hotel: true,
              },
            },
            hotel: true,
            payments: true,
          },
        });
      } else {
        // Update bill with latest running/final session totals (excluding cancelled orders)
        sessionBill = await prisma.bill.update({
          where: { id: sessionBill.id },
          data: {
            subtotal: combinedSubtotal,
            taxAmount: combinedTaxAmount,
            discountAmount: combinedDiscount,
            grandTotal: combinedTotal,
            paymentStatus: isAllCompleted ? PaymentStatus.PAID : PaymentStatus.PENDING,
          },
          include: {
            order: {
              include: {
                items: true,
                table: true,
                hotel: true,
              },
            },
            hotel: true,
            payments: true,
          },
        });
      }

      // Return unified session bill representation
      const orderNumbers = validOrders.map((o) => o.orderNumber);
      const isMultiOrder = validOrders.length > 1;

      const consolidatedBill = {
        ...sessionBill,
        subtotal: combinedSubtotal,
        taxAmount: combinedTaxAmount,
        discountAmount: combinedDiscount,
        grandTotal: combinedTotal,
        paymentStatus: isAllCompleted ? PaymentStatus.PAID : PaymentStatus.PENDING,
        sessionCode: session.sessionCode,
        orderNumbers,
        orderCount: validOrders.length,
        order: {
          ...order,
          sessionCode: session.sessionCode,
          orderNumbers,
          orderNumber: isMultiOrder
            ? session.sessionCode
            : validOrders[0]?.orderNumber || session.sessionCode,
          orderRefDisplay: isMultiOrder
            ? `${session.sessionCode} (${orderNumbers.join(", ")})`
            : validOrders[0]?.orderNumber || session.sessionCode,
          items: allItems,
        },
      };

      return NextResponse.json({ bill: consolidatedBill, session });
    }

    // Fallback for single order without session
    const isSingleCancelled = order.status === "CANCELLED";
    if (!bill) {
      const billNumber = `BILL-${new Date().getFullYear()}-${order.orderNumber.replace("ORD", "")}`;
      bill = await prisma.bill.create({
        data: {
          orderId: order.id,
          hotelId: order.hotelId,
          billNumber,
          subtotal: isSingleCancelled ? 0 : order.subtotal,
          taxAmount: isSingleCancelled ? 0 : order.taxAmount,
          discountAmount: isSingleCancelled ? 0 : order.discountAmount,
          grandTotal: isSingleCancelled ? 0 : order.totalAmount,
          paymentStatus: order.status === "COMPLETED" ? PaymentStatus.PAID : PaymentStatus.PENDING,
        },
        include: {
          order: {
            include: {
              items: true,
              table: true,
              hotel: true,
            },
          },
          hotel: true,
          payments: true,
        },
      });
    }

    // Filter out cancelled items from bill.order.items
    const filteredBill = {
      ...bill,
      order: {
        ...bill.order,
        items: bill.order.items.filter((item: any) => !item.isCancelled),
      },
    };

    return NextResponse.json({ bill: filteredBill });
  } catch (error) {
    console.error("API GET /api/bills/[orderId] error:", error);
    return NextResponse.json(
      { error: "Failed to generate or fetch bill." },
      { status: 500 }
    );
  }
}
