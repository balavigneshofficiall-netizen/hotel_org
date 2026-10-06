import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentMethod, OrderSource } from "@prisma/client";
import { notifyOrderStatusChange } from "@/lib/events";
import { sendWebPush } from "@/lib/webpush";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hotelSlug = searchParams.get("hotel") || "hotel-annapoorna";
    const status = searchParams.get("status");
    const query = searchParams.get("q")?.toLowerCase();

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug },
      select: { id: true, currency: true },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    const historyOnly = searchParams.get("history") === "true";

    const where: any = { hotelId: hotel.id };
    if (historyOnly) {
      if (status === "COMPLETED") {
        where.status = OrderStatus.COMPLETED;
      } else if (status === "CANCELLED") {
        where.status = OrderStatus.CANCELLED;
      } else {
        where.status = { in: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] };
      }
    } else if (status && status !== "ALL") {
      where.status = status as OrderStatus;
    }

    const channel = searchParams.get("channel");
    if (channel === "ONLINE") {
      where.orderSource = { in: [OrderSource.SWIGGY, OrderSource.ZOMATO] };
    } else if (channel === "DINE_IN") {
      where.orderSource = { notIn: [OrderSource.SWIGGY, OrderSource.ZOMATO] };
    }

    const source = searchParams.get("source");
    if (source && source !== "ALL") {
      where.orderSource = source;
    }

    if (query) {
      where.OR = [
        { orderNumber: { contains: query } },
        { customerName: { contains: query } },
        { customerPhone: { contains: query } },
        { table: { tableNumber: { contains: query } } },
        { externalOrderId: { contains: query } },
        { riderName: { contains: query } },
      ];
    }

    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    if (startDateParam || endDateParam) {
      where.createdAt = {};
      if (startDateParam) {
        const start = new Date(startDateParam);
        if (!isNaN(start.getTime())) {
          start.setHours(0, 0, 0, 0);
          where.createdAt.gte = start;
        }
      }
      if (endDateParam) {
        const end = new Date(endDateParam);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        table: true,
        items: true,
        bill: true,
        session: true,
        statusHistory: { orderBy: { changedAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders, currency: hotel.currency });
  } catch (err: unknown) {
    console.error("Admin orders get error:", err);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, status, note, unavailableItems, paymentMethod, orderItemId, itemId, isServed } = body;

    // 0. Handle individual item-level served toggle
    if (orderItemId !== undefined || itemId !== undefined) {
      const targetItemId = Number(orderItemId ?? itemId);
      const isServedVal = isServed !== undefined ? Boolean(isServed) : true;

      const item = await prisma.orderItem.findUnique({
        where: { id: targetItemId },
        include: {
          order: {
            include: {
              items: true,
              hotel: true,
              table: true,
            },
          },
        },
      });

      if (!item) {
        return NextResponse.json({ error: "Order item not found" }, { status: 404 });
      }

      // Update the item's served status
      const updatedItem = await prisma.orderItem.update({
        where: { id: targetItemId },
        data: {
          isServed: isServedVal,
          servedAt: isServedVal ? new Date() : null,
        },
      });

      const order = item.order;

      // Broadcast real-time SSE update for the item
      notifyOrderStatusChange({
        orderId: order.id,
        orderNumber: order.orderNumber,
        hotelId: order.hotelId,
        tableNumber: order.table?.tableNumber || "table",
        status: order.status,
        timestamp: new Date().toISOString(),
        note: `Dish ${item.productName} marked as ${isServedVal ? "Served ✨" : "Not Served"}`,
      });

      return NextResponse.json({
        success: true,
        item: updatedItem,
        orderId: order.id,
      });
    }

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    if (!status && (!unavailableItems || !Array.isArray(unavailableItems) || unavailableItems.length === 0)) {
      return NextResponse.json(
        { error: "status or unavailableItems is required" },
        { status: 400 }
      );
    }

    const validStatuses = Object.values(OrderStatus);
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const numOrderId = Number(orderId);
    const currentOrder = await prisma.order.findFirst({
      where: {
        OR: [
          ...(isNaN(numOrderId) ? [] : [{ id: numOrderId }]),
          { orderNumber: String(orderId) },
        ],
      },
      include: {
        hotel: true,
        table: true,
        bill: true,
        items: true,
      },
    });

    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const method =
      paymentMethod === "UPI"
        ? PaymentMethod.UPI
        : paymentMethod === "CARD"
          ? PaymentMethod.CARD
          : PaymentMethod.CASH;

    let finalStatus = status || currentOrder.status;
    let finalNote = note;
    let newSubtotal = currentOrder.subtotal;
    let newTax = currentOrder.taxAmount;
    let newTotal = currentOrder.totalAmount;
    let isPartialItemCancellation = false;

    // Track full cancellations and partial quantity cancellations
    const fullCancelledItemIds: number[] = [];
    const partialCancellations: Array<{
      item: (typeof currentOrder.items)[0];
      keepQty: number;
      dismissQty: number;
    }> = [];
    const dismissalSummary: string[] = [];

    if (unavailableItems && Array.isArray(unavailableItems) && unavailableItems.length > 0) {
      for (const entry of unavailableItems) {
        let itemId: number | null = null;
        let dismissQty = 1;

        if (typeof entry === "string" || typeof entry === "number") {
          const found = currentOrder.items.find(
            (i) => (String(i.id) === String(entry) || i.productName === String(entry)) && !i.isCancelled
          );
          if (found) {
            itemId = found.id;
            dismissQty = found.quantity; // default dismiss all if string passed
          }
        } else if (entry && typeof entry === "object") {
          const found = currentOrder.items.find(
            (i) => (String(i.id) === String(entry.id) || i.productName === entry.productName) && !i.isCancelled
          );
          if (found) {
            itemId = found.id;
            dismissQty =
              typeof entry.dismissQty === "number" && entry.dismissQty > 0
                ? Math.min(entry.dismissQty, found.quantity)
                : found.quantity;
          }
        }

        if (!itemId) continue;

        const targetItem = currentOrder.items.find((i) => i.id === itemId);
        if (!targetItem || targetItem.isCancelled) continue;

        if (dismissQty >= targetItem.quantity) {
          // Full item cancellation
          fullCancelledItemIds.push(targetItem.id);
          dismissalSummary.push(
            targetItem.quantity > 1
              ? `${targetItem.quantity}x ${targetItem.productName}`
              : targetItem.productName
          );
        } else if (dismissQty > 0) {
          // Partial quantity cancellation (e.g. 2 ordered, 1 dismissed)
          partialCancellations.push({
            item: targetItem,
            keepQty: targetItem.quantity - dismissQty,
            dismissQty,
          });
          dismissalSummary.push(`${dismissQty}x ${targetItem.productName}`);
        }
      }

      // Calculate remaining active items count and subtotal
      let activeSubtotal = 0;
      let activeItemsCount = 0;

      for (const item of currentOrder.items) {
        if (item.isCancelled) continue;

        const partial = partialCancellations.find((p) => p.item.id === item.id);
        if (partial) {
          activeSubtotal += partial.keepQty * item.unitPrice;
          activeItemsCount += partial.keepQty;
        } else if (!fullCancelledItemIds.includes(item.id)) {
          activeSubtotal += item.subtotal;
          activeItemsCount += item.quantity;
        }
      }

      if (activeItemsCount === 0) {
        // All items unavailable -> cancel whole order
        finalStatus = OrderStatus.CANCELLED;
        finalNote =
          note ||
          `Dish Unavailable: ${dismissalSummary.join(", ")} is out of stock. Order cancelled.`;
      } else if (dismissalSummary.length > 0) {
        // Partial cancellation: dismiss unavailable items, confirm remaining!
        isPartialItemCancellation = true;
        finalStatus =
          currentOrder.status === OrderStatus.PENDING ? OrderStatus.ACCEPTED : currentOrder.status;

        newSubtotal = Number(activeSubtotal.toFixed(2));
        newTax = Number(((newSubtotal * currentOrder.taxRate) / 100).toFixed(2));
        newTotal = Number((newSubtotal + newTax - currentOrder.discountAmount).toFixed(2));

        finalNote =
          note ||
          `⚠️ Dish Unavailable: ${dismissalSummary.join(", ")} is out of stock (removed from bill). Remaining dishes confirmed & cooking fresh!`;
      }
    } else if (!finalNote) {
      if (status === OrderStatus.ACCEPTED) {
        finalNote = "Order confirmed! All items are available. Kitchen is cooking your food fresh.";
      } else if (status === OrderStatus.PREPARING) {
        finalNote = "Chef is preparing your dishes fresh.";
      } else if (status === OrderStatus.READY) {
        finalNote = "Your food is ready to serve!";
      } else if (status === OrderStatus.SERVED) {
        finalNote = "Dishes delivered to your table. Enjoy your meal!";
      } else if (status === OrderStatus.COMPLETED) {
        finalNote = "Order completed. Thank you for dining with us!";
      } else if (status === OrderStatus.CANCELLED) {
        finalNote = "Order was cancelled by restaurant.";
      } else {
        finalNote = `Admin updated status to ${status}`;
      }
    }

    // Advance status and create audit history & notification in a transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Handle fully cancelled items
      if (fullCancelledItemIds.length > 0) {
        await tx.orderItem.updateMany({
          where: { id: { in: fullCancelledItemIds } },
          data: { isCancelled: true },
        });
      }

      // 2. Handle partial quantity items (reduce original qty & create cancelled split item)
      for (const partial of partialCancellations) {
        // Update original item with reduced active quantity
        await tx.orderItem.update({
          where: { id: partial.item.id },
          data: {
            quantity: partial.keepQty,
            subtotal: Number((partial.keepQty * partial.item.unitPrice).toFixed(2)),
            isCancelled: false,
          },
        });

        // Create a new record for the dismissed quantity so it's tracked in RED
        await tx.orderItem.create({
          data: {
            orderId: currentOrder.id,
            productId: partial.item.productId,
            productName: partial.item.productName,
            unitPrice: partial.item.unitPrice,
            quantity: partial.dismissQty,
            subtotal: Number((partial.dismissQty * partial.item.unitPrice).toFixed(2)),
            specialInstructions: "Dismissed by admin (Item out of stock)",
            isVeg: partial.item.isVeg,
            isCancelled: true,
            imageUrl: partial.item.imageUrl,
          },
        });
      }

      // If entire order was cancelled, mark all remaining items as cancelled
      if (finalStatus === OrderStatus.CANCELLED) {
        await tx.orderItem.updateMany({
          where: { orderId: currentOrder.id },
          data: { isCancelled: true },
        });
      }

      // If entire order was marked SERVED or COMPLETED, mark all active items as served
      if (finalStatus === OrderStatus.SERVED || finalStatus === OrderStatus.COMPLETED) {
        await tx.orderItem.updateMany({
          where: {
            orderId: currentOrder.id,
            isCancelled: false,
          },
          data: {
            isServed: true,
            servedAt: new Date(),
          },
        });
      }

      const order = await tx.order.update({
        where: { id: currentOrder.id },
        data: {
          status: finalStatus,
          subtotal: newSubtotal,
          taxAmount: newTax,
          totalAmount: newTotal,
          statusHistory: {
            create: {
              status: finalStatus,
              note: finalNote,
            },
          },
        },
        include: {
          table: true,
          hotel: true,
          items: true,
          bill: true,
          notifications: { orderBy: { sentAt: "desc" } },
          statusHistory: { orderBy: { changedAt: "desc" } },
        },
      });

      // Create persistent notification record for customer / order
      await tx.notification.create({
        data: {
          orderId: order.id,
          customerId: order.customerId,
          title:
            finalStatus === OrderStatus.CANCELLED
              ? "⚠️ Dish Unavailable / Order Notice"
              : isPartialItemCancellation
                ? "⚠️ Dish Unavailable · Remaining Confirmed ✅"
                : finalStatus === OrderStatus.ACCEPTED
                  ? "✅ Order Confirmed! 👨‍🍳"
                  : `Order #${order.orderNumber} ${finalStatus}`,
          body: finalNote,
        },
      });

      // If cancelled or partially cancelled and part of a session, recalculate any existing session bill
      if ((finalStatus === OrderStatus.CANCELLED || isPartialItemCancellation) && currentOrder.sessionId) {
        const session = await tx.session.findUnique({
          where: { id: currentOrder.sessionId },
          include: { orders: true },
        });

        if (session) {
          const sessionOrderIds = session.orders.map((o) => o.id);
          const existingBill = await tx.bill.findFirst({
            where: { orderId: { in: sessionOrderIds } },
          });

          if (existingBill) {
            const validOrders = session.orders.filter(
              (o) => (o.id === currentOrder.id ? finalStatus !== OrderStatus.CANCELLED : o.status !== OrderStatus.CANCELLED)
            );
            const combinedSubtotal = validOrders.reduce(
              (sum, o) => sum + (o.id === currentOrder.id ? newSubtotal : o.subtotal),
              0
            );
            const combinedTax = validOrders.reduce(
              (sum, o) => sum + (o.id === currentOrder.id ? newTax : o.taxAmount),
              0
            );
            const combinedDiscount = validOrders.reduce(
              (sum, o) => sum + (o.id === currentOrder.id ? o.discountAmount : o.discountAmount),
              0
            );
            const combinedTotal = validOrders.reduce(
              (sum, o) => sum + (o.id === currentOrder.id ? newTotal : o.totalAmount),
              0
            );

            await tx.bill.update({
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

      // If completed, generate/update unified digital bill
      if (status === OrderStatus.COMPLETED) {
        if (currentOrder.sessionId) {
          const session = await tx.session.findUnique({
            where: { id: currentOrder.sessionId },
            include: { orders: true },
          });

          if (session) {
            const otherActiveOrders = session.orders.filter(
              (o) => o.id !== currentOrder.id && o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED
            );

            if (otherActiveOrders.length === 0) {
              await tx.session.update({
                where: { id: session.id },
                data: { isActive: false, closedAt: new Date() },
              });
            }

            const validOrders = session.orders.filter(
              (o) => (o.id === currentOrder.id ? true : o.status !== OrderStatus.CANCELLED)
            );

            const combinedSubtotal = validOrders.reduce(
              (sum, o) => sum + (o.id === currentOrder.id ? order.subtotal : o.subtotal),
              0
            );
            const combinedTax = validOrders.reduce(
              (sum, o) => sum + (o.id === currentOrder.id ? order.taxAmount : o.taxAmount),
              0
            );
            const combinedDiscount = validOrders.reduce(
              (sum, o) => sum + (o.id === currentOrder.id ? order.discountAmount : o.discountAmount),
              0
            );
            const combinedTotal = validOrders.reduce(
              (sum, o) => sum + (o.id === currentOrder.id ? order.totalAmount : o.totalAmount),
              0
            );

            const sessionOrderIds = session.orders.map((o) => o.id);
            const existingBill = await tx.bill.findFirst({
              where: { orderId: { in: sessionOrderIds } },
            });

            if (existingBill) {
              await tx.bill.update({
                where: { id: existingBill.id },
                data: {
                  subtotal: combinedSubtotal,
                  taxAmount: combinedTax,
                  discountAmount: combinedDiscount,
                  grandTotal: combinedTotal,
                  paymentStatus: "PAID",
                  paymentMethod: method,
                  paidAt: new Date(),
                },
              });
            } else {
              const billNumber = `BILL-${new Date().getFullYear()}-${session.sessionCode.replace("SES-", "S")}`;
              const primaryOrderId = validOrders[0]?.id || session.orders[0].id;
              await tx.bill.create({
                data: {
                  orderId: primaryOrderId,
                  hotelId: order.hotelId,
                  billNumber,
                  subtotal: combinedSubtotal,
                  taxAmount: combinedTax,
                  discountAmount: combinedDiscount,
                  grandTotal: combinedTotal,
                  paymentStatus: "PAID",
                  paymentMethod: method,
                  paidAt: new Date(),
                },
              });
            }
          }
        } else if (!currentOrder.bill) {
          const billNumber = `BILL-${new Date().getFullYear()}-${order.orderNumber.replace(/\D/g, "")}`;
          await tx.bill.create({
            data: {
              orderId: order.id,
              hotelId: order.hotelId,
              billNumber,
              subtotal: order.subtotal,
              taxAmount: order.taxAmount,
              discountAmount: order.discountAmount,
              grandTotal: order.totalAmount,
              paymentStatus: "PAID",
              paymentMethod: method,
              paidAt: new Date(),
            },
          });
        }
      }

      return order;
    });

    const displayTableNumber =
      updatedOrder.table?.tableNumber ||
      (updatedOrder.orderSource === "SWIGGY"
        ? "Swiggy Delivery"
        : updatedOrder.orderSource === "ZOMATO"
        ? "Zomato Delivery"
        : updatedOrder.orderSource === "TAKEAWAY"
        ? "Takeaway"
        : "Online Order");

    // Notify real-time SSE event
    notifyOrderStatusChange({
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      hotelId: updatedOrder.hotelId,
      tableNumber: displayTableNumber,
      status: updatedOrder.status,
      timestamp: new Date().toISOString(),
      note: finalNote,
    });

    // Send Web Push notification if customer opted in
    try {
      if (updatedOrder.tableId) {
        const subscriptions = await prisma.pushSubscription.findMany({
          where: { tableId: updatedOrder.tableId },
        });

        const title =
          status === OrderStatus.CANCELLED
            ? `⚠️ #${updatedOrder.orderNumber} Notice: Item Unavailable`
            : status === OrderStatus.ACCEPTED
              ? `✅ #${updatedOrder.orderNumber} Confirmed!`
              : `Order #${updatedOrder.orderNumber} ${status}`;

        for (const sub of subscriptions) {
          await sendWebPush(sub, {
            title,
            body: finalNote,
            url: `/orders/${updatedOrder.id}`,
          });
        }
      }
    } catch {
      // ignore push errors
    }

    // 3. Dispatch WhatsApp Notification (PAID = background Meta Cloud API, FREE = direct wa.me link)
    let whatsapp = null;
    try {
      const { dispatchOrderStatusWhatsApp } = await import("@/lib/whatsapp");
      whatsapp = await dispatchOrderStatusWhatsApp({
        hotel: updatedOrder.hotel,
        order: {
          orderNumber: updatedOrder.orderNumber,
          customerName: updatedOrder.customerName,
          customerPhone: updatedOrder.customerPhone,
          tableNumber: displayTableNumber,
        },
        status: updatedOrder.status,
        orderUrl: `${request.nextUrl.origin}/orders/${updatedOrder.orderNumber}`,
        billUrl: `${request.nextUrl.origin}/bill/${updatedOrder.id}`,
      });
    } catch (waErr) {
      console.error("WhatsApp dispatch error:", waErr);
    }

    // 4. Relay status to Swiggy / Zomato via UrbanPiper outbound service
    if (updatedOrder.orderSource === "SWIGGY" || updatedOrder.orderSource === "ZOMATO") {
      try {
        const { notifyAggregatorOrderStatus } = await import("@/lib/urbanpiper");
        await notifyAggregatorOrderStatus({
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          externalOrderId: updatedOrder.externalOrderId,
          orderSource: updatedOrder.orderSource,
          status: updatedOrder.status,
          reason: finalNote,
          hotelId: updatedOrder.hotelId,
        });
      } catch (aggErr) {
        console.error("Aggregator outbound relay error:", aggErr);
      }
    }

    return NextResponse.json({
      order: updatedOrder,
      success: true,
      whatsapp,
    });
  } catch (err: unknown) {
    console.error("Admin order patch error:", err);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      hotelSlug = "hotel-annapoorna",
      orderSource = "DINE_IN",
      tableId,
      guestCount = 2,
      customerName,
      customerPhone,
      items,
      specialInstructions,
      status = "ACCEPTED",
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Please select at least one item from the menu." }, { status: 400 });
    }

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug },
      include: { tables: true },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
    }

    const isDineIn = orderSource === "DINE_IN";
    let table = null;

    if (isDineIn) {
      if (!tableId) {
        return NextResponse.json({ error: "Please select a table for Dine-In orders." }, { status: 400 });
      }

      table = await prisma.hotelTable.findFirst({
        where: { id: Number(tableId), hotelId: hotel.id },
      });

      if (!table) {
        return NextResponse.json({ error: "Selected table not found." }, { status: 404 });
      }
    }

    // Customer resolution
    const cleanPhone = customerPhone?.trim() ? customerPhone.trim().replace(/\s+/g, "") : "";
    let customer = null;
    const finalCustomerName = customerName?.trim() || (isDineIn ? `Guest at ${table?.tableNumber}` : "Takeaway Guest");
    const finalCustomerPhone = cleanPhone || "9999999999";

    if (cleanPhone && cleanPhone.length >= 7) {
      customer = await prisma.customer.findUnique({
        where: { phone: cleanPhone },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name: finalCustomerName,
            phone: cleanPhone,
          },
        });
      }
    }

    // Session resolution for Dine-In
    let session = null;
    const isSplitGroup = Boolean(body.isSplitGroup);
    const splitSuffix = body.splitSuffix ? String(body.splitSuffix).trim().toUpperCase() : "";
    const targetSessionId = body.targetSessionId ? Number(body.targetSessionId) : null;
    const splitLabel = isSplitGroup && splitSuffix && table ? `${table.tableNumber}-${splitSuffix}` : null;

    if (isDineIn && table) {
      if (targetSessionId) {
        // Targeted re-order for a specific active session
        session = await prisma.session.findUnique({
          where: { id: targetSessionId },
          include: {
            orders: { include: { bill: true } },
          },
        });
      } else if (!isSplitGroup) {
        // Normal re-order / addition to existing bill: reuse latest active session
        const activeSession = await prisma.session.findFirst({
          where: {
            tableId: table.id,
            hotelId: hotel.id,
            isActive: true,
            closedAt: null,
          },
          include: {
            orders: {
              include: { bill: true },
            },
          },
          orderBy: { startedAt: "desc" },
        });

        if (activeSession) {
          const hasPaidBill = activeSession.orders.some((o) => o.bill?.paymentStatus === "PAID");
          const hasLiveOrders = activeSession.orders.some((o) =>
            ["PENDING", "ACCEPTED", "PREPARING", "READY", "SERVED"].includes(o.status)
          );

          if (!hasPaidBill && (!activeSession.billRequested || hasLiveOrders)) {
            session = activeSession;
          } else {
            await prisma.session.update({
              where: { id: activeSession.id },
              data: { isActive: false, closedAt: new Date() },
            });
          }
        }
      }

      // If isSplitGroup is true OR no active session was resolved, create a brand-new session
      if (!session) {
        const lastSession = await prisma.session.findFirst({
          where: { hotelId: hotel.id },
          orderBy: { id: "desc" },
          select: { sessionCode: true },
        });

        let nextSessionNum = 1;
        if (lastSession?.sessionCode) {
          const match = lastSession.sessionCode.match(/\d+/);
          if (match) {
            nextSessionNum = parseInt(match[0], 10) + 1;
          }
        }

        let sessionCode = `SES-${String(nextSessionNum).padStart(3, "0")}`;
        while (await prisma.session.findUnique({ where: { sessionCode } })) {
          nextSessionNum++;
          sessionCode = `SES-${String(nextSessionNum).padStart(3, "0")}`;
        }

        session = await prisma.session.create({
          data: {
            hotelId: hotel.id,
            tableId: table.id,
            customerId: customer?.id || null,
            sessionCode,
            guestCount: Math.max(1, Number(guestCount) || 1),
            isActive: true,
          },
        });
      }
    }

    // Fetch product pricing
    const productIds = items.map((i: any) => Number(i.productId)).filter((id: number) => !isNaN(id));
    const dbProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        hotelId: hotel.id,
      },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let subtotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = productMap.get(Number(item.productId));
      if (!product) {
        return NextResponse.json(
          { error: `Item no longer exists in menu.` },
          { status: 400 }
        );
      }

      const qty = Math.max(1, parseInt(item.quantity) || 1);
      const itemSubtotal = product.price * qty;
      subtotal += itemSubtotal;

      orderItemsData.push({
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: qty,
        subtotal: itemSubtotal,
        specialInstructions: item.specialInstructions?.trim() || null,
        isVeg: product.isVeg,
        imageUrl: product.imageUrl,
      });
    }

    const taxRate = hotel.taxRate || 5.0;
    const taxAmount = Number(((subtotal * taxRate) / 100).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));

    // Generate sequential order number ORD-xxx
    const lastOrder = await prisma.order.findFirst({
      where: { hotelId: hotel.id },
      orderBy: { id: "desc" },
      select: { orderNumber: true },
    });

    let nextOrderNum = 1;
    if (lastOrder?.orderNumber) {
      const match = lastOrder.orderNumber.match(/\d+/);
      if (match) {
        nextOrderNum = parseInt(match[0], 10) + 1;
      }
    }

    let orderNumber = `ORD-${String(nextOrderNum).padStart(3, "0")}`;
    while (await prisma.order.findUnique({ where: { orderNumber } })) {
      nextOrderNum++;
      orderNumber = `ORD-${String(nextOrderNum).padStart(3, "0")}`;
    }

    const initialStatus = status === "PENDING" ? OrderStatus.PENDING : OrderStatus.ACCEPTED;
    const targetSource = isDineIn ? OrderSource.DINE_IN : OrderSource.TAKEAWAY;

    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        hotelId: hotel.id,
        tableId: isDineIn && table ? table.id : null,
        sessionId: isDineIn && session ? session.id : null,
        customerId: customer?.id || null,
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
        guestCount: isDineIn ? Math.max(1, Number(guestCount) || 1) : 1,
        status: initialStatus,
        orderSource: targetSource,
        externalOrderId: splitLabel || undefined,
        subtotal,
        taxRate,
        taxAmount,
        discountAmount: 0,
        totalAmount,
        specialInstructions: specialInstructions?.trim() || null,
        items: {
          create: orderItemsData,
        },
        statusHistory: {
          create: [
            {
              status: initialStatus,
              note: isSplitGroup
                ? `Split table order placed for ${splitLabel}.`
                : `Manual order placed by staff for ${isDineIn ? table?.tableNumber : "Takeaway"}.`,
            },
          ],
        },
      },
      include: {
        items: true,
        table: true,
        session: true,
        statusHistory: true,
      },
    });

    // Mark table as OCCUPIED if dine-in
    if (isDineIn && table) {
      await prisma.hotelTable.update({
        where: { id: table.id },
        data: { status: "OCCUPIED" },
      });
    }

    // Broadcast real-time SSE event
    notifyOrderStatusChange({
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      hotelId: newOrder.hotelId,
      tableNumber: splitLabel || (isDineIn && table ? table.tableNumber : "Takeaway"),
      status: initialStatus,
      timestamp: new Date().toISOString(),
      note: `Staff placed order #${newOrder.orderNumber} for ${isDineIn && table ? table.tableNumber : "Takeaway"}`,
    });

    return NextResponse.json({
      success: true,
      order: newOrder,
      sessionId: session?.id || null,
      sessionCode: session?.sessionCode || null,
    });
  } catch (err: unknown) {
    console.error("Admin order POST error:", err);
    return NextResponse.json({ error: "Failed to create manual order." }, { status: 500 });
  }
}
