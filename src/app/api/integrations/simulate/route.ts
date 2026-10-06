import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderSource, OrderStatus } from "@prisma/client";
import { notifyOrderStatusChange } from "@/lib/events";

export const dynamic = "force-dynamic";

const MOCK_CUSTOMERS = [
  { name: "Karthikeyan S", phone: "+91 98401 54321" },
  { name: "Praveen Kumar", phone: "+91 98840 12948" },
  { name: "Divya Ramesh", phone: "+91 97910 83721" },
  { name: "Anitha Mohan", phone: "+91 94440 29381" },
  { name: "Vigneshwaran M", phone: "+91 99620 48192" },
  { name: "Sneha Sundar", phone: "+91 98412 77102" },
];

const MOCK_RIDERS: Record<string, { names: string[]; phones: string[] }> = {
  SWIGGY: {
    names: [
      "Muthuvel P (Swiggy Delivery)",
      "Senthil Nathan (Swiggy Delivery)",
      "Saravanan K (Swiggy Delivery)",
      "Manikandan R (Swiggy Delivery)",
    ],
    phones: ["+91 98765 43210", "+91 97890 12345", "+91 96543 21098"],
  },
  ZOMATO: {
    names: [
      "Arun Balaji (Zomato Valet)",
      "Vijay Anand (Zomato Valet)",
      "Dinesh Kumar (Zomato Valet)",
      "Rajesh Kannan (Zomato Valet)",
    ],
    phones: ["+91 98412 87654", "+91 97103 45678", "+91 99401 23890"],
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform = "SWIGGY", hotelSlug = "hotel-annapoorna" } = body;

    const sourceEnum =
      platform.toUpperCase() === "ZOMATO" ? OrderSource.ZOMATO : OrderSource.SWIGGY;

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

    const integrationConfig = hotel.aggregatorIntegrations[0];
    const autoAccept = integrationConfig ? integrationConfig.autoAccept : true;

    // Pick 1 to 3 items from hotel's real products
    const availableProducts = await prisma.product.findMany({
      where: { hotelId: hotel.id, isAvailable: true },
      take: 15,
    });

    interface SimulatedProduct {
      id?: number | null;
      name: string;
      price: number;
      isVeg: boolean;
      imageUrl?: string | null;
    }

    let selectedProducts: SimulatedProduct[] = [];
    if (availableProducts.length > 0) {
      // Shuffle & pick 2 or 3
      const shuffled = [...availableProducts].sort(() => 0.5 - Math.random());
      selectedProducts = shuffled.slice(0, Math.floor(Math.random() * 2) + 2);
    }

    // Fallback if no products in DB
    if (selectedProducts.length === 0) {
      selectedProducts = [
        {
          id: null,
          name: "Crispy Ghee Roast Dosa",
          price: 120,
          isVeg: true,
          imageUrl: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80",
        },
        {
          id: null,
          name: "Authentic Filter Coffee",
          price: 45,
          isVeg: true,
          imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
        },
      ];
    }

    // Pick random customer
    const mockCustomer =
      MOCK_CUSTOMERS[Math.floor(Math.random() * MOCK_CUSTOMERS.length)];

    // Pick random rider
    const riderPool = MOCK_RIDERS[sourceEnum] || MOCK_RIDERS.SWIGGY;
    const riderName =
      riderPool.names[Math.floor(Math.random() * riderPool.names.length)];
    const riderPhone =
      riderPool.phones[Math.floor(Math.random() * riderPool.phones.length)];

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const orderNumber = `${sourceEnum.slice(0, 3)}-${dateCode}-${randomSuffix}`;
    const externalOrderId = `${sourceEnum}-${Math.floor(100000 + Math.random() * 900000)}`;
    const otp = String(Math.floor(1000 + Math.random() * 9000));

    // Calculate totals
    const orderItemsData = selectedProducts.map((p) => {
      const quantity = Math.floor(Math.random() * 2) + 1;
      const unitPrice = p.price;
      const subtotal = unitPrice * quantity;
      return {
        productId: p.id || undefined,
        productName: p.name,
        unitPrice,
        quantity,
        subtotal,
        isVeg: p.isVeg,
        imageUrl: p.imageUrl,
        specialInstructions:
          Math.random() > 0.6
            ? "Pack sambar and chutney separately, please."
            : null,
      };
    });

    const subtotal = orderItemsData.reduce((sum, it) => sum + it.subtotal, 0);
    const taxRate = hotel.taxRate || 5.0;
    const taxAmount = Math.round(((subtotal * taxRate) / 100) * 100) / 100;
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

    // For testing and demo, if status is specified or defaulted, land in PENDING so staff can test Accept / Out of Stock
    const initialStatus = body.status ? (body.status as OrderStatus) : OrderStatus.PENDING;

    // Create Order in DB
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        hotelId: hotel.id,
        tableId: null, // Online delivery order has no physical table
        customerName: mockCustomer.name,
        customerPhone: mockCustomer.phone,
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
        specialInstructions: null,
        items: {
          create: orderItemsData,
        },
        statusHistory: {
          create: [
            {
              status: OrderStatus.PENDING,
              note: `Incoming order placed via ${sourceEnum} App (Ext ID: #${externalOrderId})`,
            },
            ...(autoAccept
              ? [
                  {
                    status: OrderStatus.ACCEPTED,
                    note: `Auto-accepted by ${sourceEnum} integration engine. Preparing food.`,
                  },
                ]
              : []),
          ],
        },
      },
      include: {
        items: true,
        statusHistory: true,
      },
    });

    // Broadcast real-time SSE event to kitchen & admin screens!
    const displayChannel =
      sourceEnum === OrderSource.SWIGGY ? "Swiggy Delivery" : "Zomato Delivery";

    notifyOrderStatusChange({
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      hotelId: newOrder.hotelId,
      tableNumber: displayChannel,
      status: newOrder.status,
      timestamp: new Date().toISOString(),
      note: `New ${sourceEnum} order received! #${externalOrderId} · Rider: ${riderName}`,
    });

    return NextResponse.json({
      success: true,
      message: `Simulated ${sourceEnum} order #${externalOrderId} successfully created and pushed to Kitchen!`,
      order: newOrder,
    });
  } catch (error: any) {
    console.error("Simulation error:", error);
    return NextResponse.json(
      { error: "Failed to simulate aggregator order", details: error.message },
      { status: 500 }
    );
  }
}
