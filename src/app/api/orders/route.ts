import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { notifyOrderStatusChange } from "@/lib/events";

const LIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.SERVED,
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      hotelId,
      tableId,
      tableToken,
      customerName,
      customerPhone,
      guestCount,
      items,
      specialInstructions,
      sessionId: requestedSessionId,
    } = body;

    const parsedGuestCount = Math.max(1, parseInt(guestCount) || 1);

    if (!hotelId || (!tableId && !tableToken) || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid .... details. Please select items from the menu." },
        { status: 400 }
      );
    }

    if (!customerName || !customerPhone) {
      return NextResponse.json(
        { error: "Customer name and mobile number are required." },
        { status: 400 }
      );
    }

    // Verify hotel & table
    const numHotelId = Number(hotelId);
    const numTableId = Number(tableId);

    const [hotel, table] = await Promise.all([
      prisma.hotel.findFirst({
        where: isNaN(numHotelId) ? { slug: String(hotelId) } : { OR: [{ id: numHotelId }, { slug: String(hotelId) }] },
      }),
      tableToken
        ? prisma.hotelTable.findFirst({
          where: { qrCodeToken: String(tableToken) },
        })
        : prisma.hotelTable.findFirst({
          where: isNaN(numTableId) ? { qrCodeToken: String(tableId) } : { OR: [{ id: numTableId }, { qrCodeToken: String(tableId) }] },
        }),
    ]);

    if (!hotel || !table) {
      return NextResponse.json(
        { error: "Invalid hotel or table QR information." },
        { status: 404 }
      );
    }

    // Find or create customer
    const cleanPhone = customerPhone.replace(/\s+/g, "");
    let customer = await prisma.customer.findUnique({
      where: { phone: cleanPhone },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName.trim(),
          phone: cleanPhone,
        },
      });
    } else if (customer.name !== customerName.trim()) {
      // Update customer name if provided differently
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { name: customerName.trim() },
      });
    }

    // STRICT BUSINESS RULE:
    // If this customer already has a LIVE uncompleted order on a DIFFERENT table,
    // prevent placing a new order on this table to avoid kitchen confusion and split bills!
    const existingActiveOrderOnOtherTable = await prisma.order.findFirst({
      where: {
        customerId: customer.id,
        hotelId: hotel.id,
        tableId: { not: table.id },
        status: { in: LIVE_ORDER_STATUSES },
      },
      include: {
        table: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingActiveOrderOnOtherTable) {
      return NextResponse.json(
        {
          error: `You already have an active order (#${existingActiveOrderOnOtherTable.orderNumber}) at ${existingActiveOrderOnOtherTable.table.tableNumber}. You cannot place an order at ${table.tableNumber} until your current order is completed or paid.`,
          hasActiveOrderOnOtherTable: true,
          activeOrderNumber: existingActiveOrderOnOtherTable.orderNumber,
          activeTableNumber: existingActiveOrderOnOtherTable.table.tableNumber,
        },
        { status: 409 }
      );
    }

    // --- TABLE CAPACITY & SEAT ALLOCATION ---
    const activeOrdersOnTable = await prisma.order.findMany({
      where: {
        tableId: table.id,
        status: { in: LIVE_ORDER_STATUSES },
      },
      select: {
        customerId: true,
        guestCount: true,
      },
    });

    const isExistingDinerOnThisTable = activeOrdersOnTable.some(
      (o) => o.customerId === customer.id
    );

    // If new party at this table, verify seat capacity
    if (!isExistingDinerOnThisTable) {
      const occupiedSeats = activeOrdersOnTable.reduce(
        (sum, o) => sum + (o.guestCount || 1),
        0
      );
      const cap = table.capacity || 4;
      const availableSeats = Math.max(0, cap - occupiedSeats);

      if (availableSeats < parsedGuestCount) {
        return NextResponse.json(
          {
            error:
              availableSeats === 0
                ? `${table.tableNumber} is completely full (${cap}/${cap} seats occupied). Please choose another table.`
                : `Only ${availableSeats} seat(s) available at ${table.tableNumber}. You requested ${parsedGuestCount} guests.`,
            availableSeats,
            capacity: cap,
            occupiedSeats,
          },
          { status: 400 }
        );
      }
    }

    // --- SESSION LOGIC ---
    let session = null;

    if (requestedSessionId) {
      const numSessionId = Number(requestedSessionId);
      session = await prisma.session.findFirst({
        where: {
          ...(isNaN(numSessionId) ? { sessionCode: String(requestedSessionId) } : { OR: [{ id: numSessionId }, { sessionCode: String(requestedSessionId) }] }),
          tableId: table.id,
          hotelId: hotel.id,
          customerId: customer.id,
          isActive: true,
          closedAt: null,
        },
        include: {
          orders: {
            include: { bill: true },
          },
        },
      });

      if (session) {
        const hasPaidBill = session.orders.some((o) => o.bill?.paymentStatus === "PAID");
        const hasLiveOrders = session.orders.some((o) => LIVE_ORDER_STATUSES.includes(o.status));
        if (hasPaidBill || (session.billRequested && !hasLiveOrders) || (!hasLiveOrders && session.orders.length > 0)) {
          await prisma.session.update({
            where: { id: session.id },
            data: { isActive: false, closedAt: new Date() },
          });
          session = null;
        }
      }
    }

    if (!session) {
      // Check for any active session on this table for THIS customer
      const candidateSession = await prisma.session.findFirst({
        where: {
          tableId: table.id,
          hotelId: hotel.id,
          customerId: customer.id,
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

      if (candidateSession) {
        const hasPaidBill = candidateSession.orders.some((o) => o.bill?.paymentStatus === "PAID");
        const hasLiveOrders = candidateSession.orders.some((o) => LIVE_ORDER_STATUSES.includes(o.status));
        if (hasPaidBill || (candidateSession.billRequested && !hasLiveOrders) || (!hasLiveOrders && candidateSession.orders.length > 0)) {
          await prisma.session.update({
            where: { id: candidateSession.id },
            data: { isActive: false, closedAt: new Date() },
          });
        } else if (!candidateSession.billRequested) {
          session = candidateSession;
        }
      }
    }

    if (session) {
      if (session.isActive && session.billRequested) {
        return NextResponse.json(
          {
            error:
              "Bill has already been requested for this table session. Please proceed to the billing counter to complete your payment.",
          },
          { status: 400 }
        );
      }
    } else {
      // No active session — create a new one sequentially: SES-001, SES-002, etc.
      const lastSession = await prisma.session.findFirst({
        where: { hotelId: hotel.id },
        orderBy: { id: "desc" },
        select: { sessionCode: true },
      });

      let nextSessionNumber = 1;
      if (lastSession?.sessionCode) {
        const match = lastSession.sessionCode.match(/\d+/);
        if (match) {
          nextSessionNumber = parseInt(match[0], 10) + 1;
        }
      }

      let sessionCode = `SES-${String(nextSessionNumber).padStart(3, "0")}`;
      while (await prisma.session.findUnique({ where: { sessionCode } })) {
        nextSessionNumber++;
        sessionCode = `SES-${String(nextSessionNumber).padStart(3, "0")}`;
      }

      session = await prisma.session.create({
        data: {
          hotelId: hotel.id,
          tableId: table.id,
          customerId: customer.id,
          sessionCode,
          guestCount: parsedGuestCount,
          isActive: true,
        },
      });
    }

    // Fetch product details for all ordered items to ensure accurate pricing
    const productIds = items
      .map((i: { productId: string | number }) => Number(i.productId))
      .filter((n: number) => !isNaN(n));

    const dbProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        hotelId: hotel.id,
      },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Calculate subtotal & construct snapshot items
    let subtotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = productMap.get(Number(item.productId));
      if (!product) {
        return NextResponse.json(
          { error: `Item no longer available on the menu.` },
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

    // Tax calculation
    const taxRate = hotel.taxRate || 5.0;
    const taxAmount = Number(((subtotal * taxRate) / 100).toFixed(2));
    const discountAmount = 0;
    const totalAmount = Number((subtotal + taxAmount - discountAmount).toFixed(2));

    // Generate sequential order number: ORD-001, ORD-002, etc.
    const lastOrder = await prisma.order.findFirst({
      where: { hotelId: hotel.id },
      orderBy: { id: "desc" },
      select: { orderNumber: true },
    });

    let nextOrderNumber = 1;
    if (lastOrder?.orderNumber) {
      const match = lastOrder.orderNumber.match(/\d+/);
      if (match) {
        nextOrderNumber = parseInt(match[0], 10) + 1;
      }
    }

    let orderNumber = `ORD-${String(nextOrderNumber).padStart(3, "0")}`;
    while (await prisma.order.findUnique({ where: { orderNumber } })) {
      nextOrderNumber++;
      orderNumber = `ORD-${String(nextOrderNumber).padStart(3, "0")}`;
    }

    // Count how many orders already exist in this session
    const existingOrderCount = await prisma.order.count({
      where: { sessionId: session.id },
    });

    // Create Order with snapshots and initial history
    const order = await prisma.order.create({
      data: {
        orderNumber,
        hotelId: hotel.id,
        tableId: table.id,
        customerId: customer.id,
        sessionId: session.id,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        guestCount: parsedGuestCount,
        status: OrderStatus.PENDING,
        subtotal,
        taxRate,
        taxAmount,
        discountAmount,
        totalAmount,
        specialInstructions: specialInstructions?.trim() || null,
        items: {
          create: orderItemsData,
        },
        statusHistory: {
          create: {
            status: OrderStatus.PENDING,
            note: existingOrderCount > 0
              ? `Additional order (#${existingOrderCount + 1}) placed from ${table.tableNumber}`
              : `Order placed (${parsedGuestCount} guests) from ${table.tableNumber}`,
          },
        },
      },
      include: {
        items: true,
        statusHistory: true,
        hotel: true,
        table: true,
        session: true,
      },
    });

    // Update table status if completely full
    const totalOccupied = (isExistingDinerOnThisTable ? 0 : parsedGuestCount) +
      activeOrdersOnTable.reduce((sum, o) => sum + (o.guestCount || 1), 0);
    if (totalOccupied >= (table.capacity || 4)) {
      await prisma.hotelTable.update({
        where: { id: table.id },
        data: { status: "OCCUPIED" },
      });
    }

    // Notify realtime listeners
    notifyOrderStatusChange({
      orderId: order.id,
      orderNumber: order.orderNumber,
      hotelId: order.hotelId,
      tableNumber: table.tableNumber,
      status: OrderStatus.PENDING,
      timestamp: new Date().toISOString(),
      note: existingOrderCount > 0
        ? `Additional order from ${table.tableNumber} (Batch #${existingOrderCount + 1})`
        : `Order placed (${parsedGuestCount} guests) from ${table.tableNumber}`,
    });

    return NextResponse.json({
      success: true,
      order,
      sessionId: session.id,
      sessionCode: session.sessionCode,
      orderBatchNumber: existingOrderCount + 1,
    });
  } catch (error) {
    console.error("API POST /api/orders error:", error);
    return NextResponse.json(
      { error: "Failed to place order. Please try again." },
      { status: 500 }
    );
  }
}

