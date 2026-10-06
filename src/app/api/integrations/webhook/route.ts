import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderSource, OrderStatus } from "@prisma/client";
import { notifyOrderStatusChange } from "@/lib/events";

export const dynamic = "force-dynamic";

/**
 * Universal UrbanPiper / Swiggy / Zomato Webhook Receiver
 * Handles incoming webhooks for:
 * - order_placed
 * - rider_status_update
 * - order_cancelled
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const event = payload.event || payload.action || "order_placed";
    const channel = (payload.channel || payload.platform || "SWIGGY").toUpperCase();
    const sourceEnum =
      channel === "ZOMATO" ? OrderSource.ZOMATO : OrderSource.SWIGGY;

    const hotelSlug =
      request.nextUrl.searchParams.get("hotel") || "hotel-annapoorna";

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug },
      include: {
        aggregatorIntegrations: {
          where: { platform: sourceEnum },
        },
      },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    // 1. ORDER PLACED EVENT
    if (event === "order_placed" || event === "order.create" || event === "ORDER_RELAY") {
      const orderData = payload.order || payload;
      const externalOrderId = String(
        orderData.id || orderData.order_id || orderData.external_id || `EXT-${Date.now()}`
      );
      const customer = orderData.customer || {};
      const customerName = customer.name || `${sourceEnum} Customer`;
      const customerPhone = customer.phone || "+91 99999 99999";
      const deliveryPartner = orderData.delivery_partner || orderData.rider || {};
      const riderName = deliveryPartner.name || `${sourceEnum} Valet Assigned`;
      const riderPhone = deliveryPartner.phone || "";
      const otp = orderData.otp || String(Math.floor(1000 + Math.random() * 9000));

      const rawItems = orderData.items || orderData.order_items || [];
      const orderItems = rawItems.map((it: any) => ({
        productName: it.title || it.name || "Special Dish",
        unitPrice: Number(it.price || it.unit_price || 100),
        quantity: Number(it.quantity || 1),
        subtotal: Number((it.price || 100) * (it.quantity || 1)),
        isVeg: Boolean(it.is_veg ?? true),
        specialInstructions: it.instructions || null,
      }));

      const subtotal = orderItems.reduce((acc: number, it: any) => acc + it.subtotal, 0);
      const taxRate = hotel.taxRate || 5.0;
      const taxAmount = Math.round(((subtotal * taxRate) / 100) * 100) / 100;
      const totalAmount =
        Number(orderData.total_amount || orderData.payable_amount) ||
        Math.round((subtotal + taxAmount) * 100) / 100;

      const autoAccept = hotel.aggregatorIntegrations[0]?.autoAccept ?? true;
      const initialStatus = autoAccept ? OrderStatus.ACCEPTED : OrderStatus.PENDING;

      const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const orderNumber = `${sourceEnum.slice(0, 3)}-${dateCode}-${Math.floor(1000 + Math.random() * 9000)}`;

      const createdOrder = await prisma.order.create({
        data: {
          orderNumber,
          hotelId: hotel.id,
          tableId: null,
          customerName,
          customerPhone,
          guestCount: 1,
          status: initialStatus,
          orderSource: sourceEnum,
          externalOrderId,
          riderName,
          riderPhone,
          riderStatus: "ASSIGNED",
          otp,
          subtotal,
          taxRate,
          taxAmount,
          discountAmount: 0,
          totalAmount,
          specialInstructions: orderData.instructions || `Order from ${sourceEnum}`,
          items: {
            create: orderItems,
          },
          statusHistory: {
            create: [
              {
                status: OrderStatus.PENDING,
                note: `Order webhook received from ${sourceEnum} (#${externalOrderId})`,
              },
              ...(autoAccept
                ? [
                    {
                      status: OrderStatus.ACCEPTED,
                      note: `Order auto-confirmed via UrbanPiper engine.`,
                    },
                  ]
                : []),
            ],
          },
        },
      });

      notifyOrderStatusChange({
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        hotelId: createdOrder.hotelId,
        tableNumber: sourceEnum === OrderSource.SWIGGY ? "Swiggy Delivery" : "Zomato Delivery",
        status: createdOrder.status,
        timestamp: new Date().toISOString(),
        note: `New incoming ${sourceEnum} order #${externalOrderId}`,
      });

      return NextResponse.json({
        status: "success",
        message: "Order placed and routed to kitchen",
        order_id: createdOrder.id,
        order_number: createdOrder.orderNumber,
      });
    }

    // 2. RIDER UPDATE EVENT
    if (event === "rider_status_update" || event === "delivery_status_update") {
      const externalOrderId = String(payload.order_id || payload.external_id);
      const rider = payload.rider || {};

      const existingOrder = await prisma.order.findFirst({
        where: { externalOrderId },
      });

      if (existingOrder) {
        await prisma.order.update({
          where: { id: existingOrder.id },
          data: {
            riderName: rider.name || existingOrder.riderName,
            riderPhone: rider.phone || existingOrder.riderPhone,
            riderStatus: payload.rider_status || payload.status || "ARRIVED",
          },
        });

        notifyOrderStatusChange({
          orderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
          hotelId: existingOrder.hotelId,
          tableNumber: existingOrder.orderSource === OrderSource.SWIGGY ? "Swiggy Delivery" : "Zomato Delivery",
          status: existingOrder.status,
          timestamp: new Date().toISOString(),
          note: `Delivery Partner Update: ${rider.name || "Rider"} is ${payload.rider_status || "near store"}`,
        });
      }

      return NextResponse.json({ status: "success", message: "Rider status updated" });
    }

    return NextResponse.json({ status: "acknowledged", event });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed", details: error.message }, { status: 500 });
  }
}
