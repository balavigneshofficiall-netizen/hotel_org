import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Fetch orders to aggregate customer spending & order count
    const orders = await prisma.order.findMany({
      where: { hotelId: hotel.id },
      include: {
        table: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Aggregate by phone number
    const customerMap = new Map<
      string,
      {
        phone: string;
        name: string;
        ordersCount: number;
        totalSpent: number;
        lastOrderDate: Date;
        lastTable: string;
        orders: any[];
      }
    >();

    orders.forEach((o) => {
      const phone = o.customerPhone;
      if (!customerMap.has(phone)) {
        customerMap.set(phone, {
          phone,
          name: o.customerName,
          ordersCount: 0,
          totalSpent: 0,
          lastOrderDate: o.createdAt,
          lastTable: o.table?.tableNumber || "Table",
          orders: [],
        });
      }

      const c = customerMap.get(phone)!;
      c.ordersCount += 1;
      if (o.status !== "CANCELLED") {
        c.totalSpent += o.totalAmount;
      }
      c.orders.push({
        id: o.id,
        orderNumber: o.orderNumber,
        tableNumber: o.table?.tableNumber,
        status: o.status,
        totalAmount: o.totalAmount,
        createdAt: o.createdAt,
        itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
      });
    });

    let customers = Array.from(customerMap.values());

    if (query) {
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.phone.toLowerCase().includes(query)
      );
    }

    customers.sort((a, b) => b.totalSpent - a.totalSpent);

    return NextResponse.json({
      customers,
      totalCount: customers.length,
      currency: hotel.currency,
    });
  } catch (err: unknown) {
    console.error("Admin customers get error:", err);
    return NextResponse.json(
      { error: "Failed to load customers" },
      { status: 500 }
    );
  }
}
