import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hotelSlug = searchParams.get("hotel") || "hotel-annapoorna";

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug },
      select: { id: true, currency: true },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const startOfYesterday = new Date(startOfDay);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const endOfYesterday = new Date(startOfDay);
    endOfYesterday.setMilliseconds(-1);

    // Fetch all real orders from database for this hotel
    const rawOrders = await prisma.order.findMany({
      where: { hotelId: hotel.id },
      include: {
        table: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Deduplicate orders by ID to guarantee 0 duplicate entries
    const uniqueOrdersMap = new Map<number, (typeof rawOrders)[0]>();
    for (const o of rawOrders) {
      if (!uniqueOrdersMap.has(o.id)) {
        uniqueOrdersMap.set(o.id, o);
      }
    }
    const allOrders = Array.from(uniqueOrdersMap.values());

    // 1. Today's metrics (original DB data only)
    const todayOrders = allOrders.filter(
      (o) => new Date(o.createdAt) >= startOfDay && new Date(o.createdAt) <= endOfDay
    );

    const todaySales = todayOrders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const todayOrderCount = todayOrders.length;
    const avgOrderValue = todayOrderCount > 0 ? todaySales / todayOrderCount : 0;
    const uniqueCustomers = new Set(todayOrders.map((o) => o.customerPhone)).size;

    // 2. All-Time / Lifetime metrics (original DB data only)
    const lifetimeSales = allOrders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const lifetimeOrderCount = allOrders.length;
    const lifetimeUniqueCustomers = new Set(allOrders.map((o) => o.customerPhone)).size;
    const lifetimeAvgOrderValue =
      lifetimeOrderCount > 0 ? lifetimeSales / lifetimeOrderCount : 0;

    // 3. Yesterday's metrics for real comparison
    const yesterdayOrders = allOrders.filter(
      (o) => new Date(o.createdAt) >= startOfYesterday && new Date(o.createdAt) <= endOfYesterday
    );
    const yesterdaySales = yesterdayOrders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    let salesGrowthPercent: number | null = null;
    if (yesterdaySales > 0) {
      salesGrowthPercent = Number(
        (((todaySales - yesterdaySales) / yesterdaySales) * 100).toFixed(1)
      );
    }

    // 4. Custom Date Range metrics (if requested)
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    let rangeSales = todaySales;
    let rangeOrderCount = todayOrderCount;
    let rangeUniqueCustomers = uniqueCustomers;
    let rangeAvgOrderValue = avgOrderValue;

    if (startDateParam || endDateParam) {
      const rStart = startDateParam ? new Date(startDateParam + "T00:00:00.000") : new Date(0);
      const rEnd = endDateParam ? new Date(endDateParam + "T23:59:59.999") : new Date();

      const rangeOrders = allOrders.filter((o) => {
        const d = new Date(o.createdAt);
        return d >= rStart && d <= rEnd;
      });

      rangeSales = rangeOrders
        .filter((o) => o.status !== "CANCELLED")
        .reduce((sum, o) => sum + o.totalAmount, 0);

      rangeOrderCount = rangeOrders.length;
      rangeUniqueCustomers = new Set(rangeOrders.map((o) => o.customerPhone)).size;
      rangeAvgOrderValue = rangeOrderCount > 0 ? rangeSales / rangeOrderCount : 0;
    }

    // 5. Active orders currently in the pipeline - Segregated by Channel
    const isOnline = (source: string | null | undefined) =>
      source === "SWIGGY" || source === "ZOMATO";

    const dineInActiveOrders = allOrders.filter(
      (o) =>
        ["PENDING", "ACCEPTED", "PREPARING", "READY"].includes(o.status) &&
        !isOnline(o.orderSource)
    );

    const onlineActiveOrders = allOrders.filter(
      (o) =>
        ["PENDING", "ACCEPTED", "PREPARING", "READY"].includes(o.status) &&
        isOnline(o.orderSource)
    );

    const dineInPendingOrders = allOrders.filter(
      (o) => o.status === "PENDING" && !isOnline(o.orderSource)
    );

    const onlinePendingOrders = allOrders.filter(
      (o) => o.status === "PENDING" && isOnline(o.orderSource)
    );

    const activeOrders = allOrders.filter((o) =>
      ["PENDING", "ACCEPTED", "PREPARING", "READY"].includes(o.status)
    );

    // 6. Recent real orders for live operational feed
    const recentOrders = (startDateParam || endDateParam
      ? allOrders.filter((o) => {
          const d = new Date(o.createdAt);
          const rStart = startDateParam ? new Date(startDateParam + "T00:00:00.000") : new Date(0);
          const rEnd = endDateParam ? new Date(endDateParam + "T23:59:59.999") : new Date();
          return d >= rStart && d <= rEnd;
        })
      : allOrders
    ).slice(0, 10).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      tableNumber: o.table?.tableNumber || "Table",
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
      totalAmount: o.totalAmount,
      status: o.status,
      createdAt: o.createdAt,
    }));

    // 7. Status distribution
    const statusCounts = {
      NEW: allOrders.filter((o) => o.status === "PENDING").length,
      ACCEPTED: allOrders.filter((o) => o.status === "ACCEPTED").length,
      PREPARING: allOrders.filter((o) => o.status === "PREPARING").length,
      READY: allOrders.filter((o) => o.status === "READY").length,
      SERVED: allOrders.filter((o) => o.status === "SERVED").length,
      COMPLETED: allOrders.filter((o) => o.status === "COMPLETED").length,
    };

    // 8. Recent notifications generated from REAL orders
    const recentNotifications = allOrders.slice(0, 5).map((o) => ({
      id: o.id,
      title: `Order #${o.orderNumber} ${o.status}`,
      desc: `${o.table?.tableNumber || "Table"} · ${o.items.length} items · ${hotel.currency}${o.totalAmount.toFixed(0)}`,
      time: new Date(o.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: (o.status === "PENDING"
        ? "new"
        : o.status === "READY"
        ? "ready"
        : "alert") as "new" | "ready" | "alert",
    }));

    return NextResponse.json({
      // Today (pure DB data)
      todaySales,
      todayOrders: todayOrderCount,
      uniqueCustomers,
      avgOrderValue,
      yesterdaySales,
      salesGrowthPercent,

      // Custom Range (if date range specified)
      rangeSales,
      rangeOrders: rangeOrderCount,
      rangeUniqueCustomers,
      rangeAvgOrderValue,

      // Lifetime (pure DB data)
      lifetimeSales,
      lifetimeOrders: lifetimeOrderCount,
      lifetimeCustomers: lifetimeUniqueCustomers,
      lifetimeAvgOrderValue,

      // Pipeline & lists - Segregated
      activeOrdersCount: dineInActiveOrders.length, // Strict Dine-in count for standard 'Orders' badge
      dineInActiveOrdersCount: dineInActiveOrders.length,
      dineInPendingCount: dineInPendingOrders.length,
      onlineActiveOrdersCount: onlineActiveOrders.length,
      onlinePendingCount: onlinePendingOrders.length,
      totalActiveOrdersCount: activeOrders.length,
      recentOrders,
      statusCounts,
      recentNotifications,
      currency: hotel.currency,
    });
  } catch (err: unknown) {
    console.error("Admin stats error:", err);
    return NextResponse.json(
      { error: "Failed to load dashboard statistics" },
      { status: 500 }
    );
  }
}
