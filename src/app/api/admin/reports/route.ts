import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hotelSlug = searchParams.get("hotel") || "hotel-annapoorna";

    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const daysParam = parseInt(searchParams.get("days") || "7", 10);

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug },
      select: { id: true, currency: true, name: true },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    // Determine Date Boundaries
    let startDateTime: Date;
    let endDateTime: Date;
    let dateKeys: string[] = [];

    if (startDateParam && endDateParam) {
      startDateTime = new Date(`${startDateParam}T00:00:00`);
      endDateTime = new Date(`${endDateParam}T23:59:59.999`);

      // Generate date keys for each day in range
      const curr = new Date(startDateTime);
      while (curr <= endDateTime && dateKeys.length <= 90) {
        dateKeys.push(curr.toISOString().slice(0, 10));
        curr.setDate(curr.getDate() + 1);
      }
    } else {
      const numDays = isNaN(daysParam) || daysParam <= 0 ? 7 : Math.min(daysParam, 90);
      const now = new Date();
      startDateTime = new Date(now);
      startDateTime.setDate(startDateTime.getDate() - (numDays - 1));
      startDateTime.setHours(0, 0, 0, 0);

      endDateTime = new Date(now);
      endDateTime.setHours(23, 59, 59, 999);

      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dateKeys.push(d.toISOString().slice(0, 10));
      }
    }

    // 1. Fetch Orders within range with items & product category
    const orders = await prisma.order.findMany({
      where: {
        hotelId: hotel.id,
        createdAt: {
          gte: startDateTime,
          lte: endDateTime,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                isVeg: true,
                category: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const activeOrders = orders.filter((o) => o.status !== "CANCELLED");

    // 2. Fetch Bills within range for real payment breakdown
    const bills = await prisma.bill.findMany({
      where: {
        hotelId: hotel.id,
        paymentStatus: "PAID",
        generatedAt: {
          gte: startDateTime,
          lte: endDateTime,
        },
      },
      select: {
        id: true,
        grandTotal: true,
        paymentMethod: true,
        generatedAt: true,
      },
    });

    // ─── Daily Sales Aggregation ───
    const daysMap: Record<
      string,
      { date: string; label: string; fullDate: string; sales: number; orders: number }
    > = {};

    dateKeys.forEach((key) => {
      const parts = key.split("-").map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);

      const label = d.toLocaleDateString([], {
        weekday: dateKeys.length <= 7 ? "short" : undefined,
        day: "numeric",
        month: "short",
      });
      const fullDate = d.toLocaleDateString([], {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      daysMap[key] = { date: key, label, fullDate, sales: 0, orders: 0 };
    });

    activeOrders.forEach((o) => {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      if (daysMap[key]) {
        daysMap[key].sales += o.totalAmount;
        daysMap[key].orders += 1;
      }
    });

    const dailySales = Object.values(daysMap);

    // ─── Popular Food Items ───
    const itemMap = new Map<
      string,
      { name: string; count: number; revenue: number; isVeg: boolean; category: string }
    >();

    let totalItemsSold = 0;

    activeOrders.forEach((o) => {
      o.items.forEach((i) => {
        totalItemsSold += i.quantity;
        const key = i.productName.trim();
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            name: key,
            count: 0,
            revenue: 0,
            isVeg: i.isVeg || i.product?.isVeg || false,
            category: i.product?.category?.name || "Main Course",
          });
        }
        const item = itemMap.get(key)!;
        item.count += i.quantity;
        item.revenue += i.subtotal;
      });
    });

    const popularFoods = Array.from(itemMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ─── Hourly Dining Distribution (11 AM to 11 PM) ───
    const hourSlots = [
      { hour: 11, label: "11 AM", name: "Early Lunch" },
      { hour: 12, label: "12 PM", name: "Lunch Rush" },
      { hour: 13, label: "1 PM", name: "Lunch Peak" },
      { hour: 14, label: "2 PM", name: "Late Lunch" },
      { hour: 15, label: "3 PM", name: "Afternoon" },
      { hour: 18, label: "6 PM", name: "Early Dinner" },
      { hour: 19, label: "7 PM", name: "Dinner Rush" },
      { hour: 20, label: "8 PM", name: "Dinner Peak" },
      { hour: 21, label: "9 PM", name: "Late Dinner" },
      { hour: 22, label: "10 PM", name: "Night Close" },
    ];

    const hourMap: Record<number, { count: number; sales: number }> = {};
    hourSlots.forEach((s) => {
      hourMap[s.hour] = { count: 0, sales: 0 };
    });

    activeOrders.forEach((o) => {
      const orderHour = new Date(o.createdAt).getHours();
      if (hourMap[orderHour] !== undefined) {
        hourMap[orderHour].count += 1;
        hourMap[orderHour].sales += o.totalAmount;
      } else {
        const nearest = hourSlots.reduce((prev, curr) =>
          Math.abs(curr.hour - orderHour) < Math.abs(prev.hour - orderHour) ? curr : prev
        );
        hourMap[nearest.hour].count += 1;
        hourMap[nearest.hour].sales += o.totalAmount;
      }
    });

    const hours = hourSlots.map((s) => ({
      hour: s.hour,
      label: s.label,
      name: s.name,
      count: hourMap[s.hour].count,
      sales: Math.round(hourMap[s.hour].sales),
    }));

    // ─── Real Payment Method Breakdown ───
    let upiTotal = 0;
    let upiCount = 0;
    let cashTotal = 0;
    let cashCount = 0;
    let cardTotal = 0;
    let cardCount = 0;

    bills.forEach((b) => {
      if (b.paymentMethod === "UPI") {
        upiTotal += b.grandTotal;
        upiCount += 1;
      } else if (b.paymentMethod === "CASH") {
        cashTotal += b.grandTotal;
        cashCount += 1;
      } else if (b.paymentMethod === "CARD") {
        cardTotal += b.grandTotal;
        cardCount += 1;
      } else {
        upiTotal += b.grandTotal;
        upiCount += 1;
      }
    });

    const totalPaidAmount = upiTotal + cashTotal + cardTotal || 1;
    const paymentMethods = [
      {
        method: "UPI / QR",
        amount: Math.round(upiTotal),
        count: upiCount,
        percent: Math.round((upiTotal / totalPaidAmount) * 100),
        color: "#12372A",
      },
      {
        method: "Cash at Counter",
        amount: Math.round(cashTotal),
        count: cashCount,
        percent: Math.round((cashTotal / totalPaidAmount) * 100),
        color: "#C9A227",
      },
      {
        method: "Credit / Debit Card",
        amount: Math.round(cardTotal),
        count: cardCount,
        percent: Math.round((cardTotal / totalPaidAmount) * 100),
        color: "#3B82F6",
      },
    ];

    // ─── Category Breakdown ───
    const catMap = new Map<string, { name: string; revenue: number; ordersCount: number }>();
    activeOrders.forEach((o) => {
      o.items.forEach((i) => {
        const catName = i.product?.category?.name || "Specials";
        if (!catMap.has(catName)) {
          catMap.set(catName, { name: catName, revenue: 0, ordersCount: 0 });
        }
        const c = catMap.get(catName)!;
        c.revenue += i.subtotal;
        c.ordersCount += i.quantity;
      });
    });

    const totalCatRevenue = Array.from(catMap.values()).reduce((sum, c) => sum + c.revenue, 0) || 1;
    const categorySales = Array.from(catMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((c) => ({
        ...c,
        revenue: Math.round(c.revenue),
        percent: Math.round((c.revenue / totalCatRevenue) * 100),
      }));

    // ─── Summary Metrics ───
    const totalRevenue = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = activeOrders.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const bestDay = [...dailySales].sort((a, b) => b.sales - a.sales)[0] || {
      label: "-",
      sales: 0,
      orders: 0,
    };

    return NextResponse.json({
      summary: {
        totalRevenue: Math.round(totalRevenue),
        totalOrders,
        avgOrderValue,
        totalItemsSold,
        topSellingItem: popularFoods[0] || null,
        bestSalesDay: bestDay,
        startDate: startDateTime.toISOString().slice(0, 10),
        endDate: endDateTime.toISOString().slice(0, 10),
      },
      dailySales,
      popularFoods,
      hours,
      paymentMethods,
      categorySales,
      currency: "₹",
    });
  } catch (err: unknown) {
    console.error("Admin reports get error:", err);
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }
}
