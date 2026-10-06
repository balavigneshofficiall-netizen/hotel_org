import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hotelId, orderId, orderNumber, tableNumber, rating, tags, comment, customerName, customerPhone } = body;

    if (!hotelId) {
      return NextResponse.json({ error: "hotelId is required" }, { status: 400 });
    }

    let resolvedCustomerName = customerName || null;
    let resolvedCustomerPhone = customerPhone || null;
    let resolvedOrderId = orderId ? Number(orderId) : null;

    if (!resolvedOrderId && orderNumber) {
      const order = await prisma.order.findUnique({
        where: { orderNumber: String(orderNumber) },
        select: { id: true, customerName: true, customerPhone: true },
      });
      if (order) {
        resolvedOrderId = order.id;
        if (!resolvedCustomerName) resolvedCustomerName = order.customerName;
        if (!resolvedCustomerPhone) resolvedCustomerPhone = order.customerPhone;
      }
    } else if (resolvedOrderId && (!resolvedCustomerName || !resolvedCustomerPhone)) {
      const order = await prisma.order.findUnique({
        where: { id: resolvedOrderId },
        select: { customerName: true, customerPhone: true },
      });
      if (order) {
        if (!resolvedCustomerName) resolvedCustomerName = order.customerName;
        if (!resolvedCustomerPhone) resolvedCustomerPhone = order.customerPhone;
      }
    }

    const feedback = await prisma.feedback.create({
      data: {
        hotelId: Number(hotelId),
        orderId: resolvedOrderId,
        orderNumber: orderNumber ? String(orderNumber) : null,
        tableNumber: tableNumber ? String(tableNumber) : null,
        customerName: resolvedCustomerName,
        customerPhone: resolvedCustomerPhone,
        rating: Math.max(1, Math.min(5, Number(rating) || 5)),
        tags: tags ? String(tags) : null,
        comment: comment ? String(comment) : null,
      },
    });

    return NextResponse.json({ success: true, feedback });
  } catch (err: unknown) {
    console.error("Failed to save customer feedback:", err);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hotelId = searchParams.get("hotelId");
    const ratingFilter = searchParams.get("rating");

    const where: any = {};
    if (hotelId) {
      where.hotelId = Number(hotelId);
    }
    if (ratingFilter && ratingFilter !== "all") {
      where.rating = Number(ratingFilter);
    }

    const [rawFeedbacks, allForStats] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          order: {
            select: {
              customerName: true,
              customerPhone: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
      prisma.feedback.findMany({
        where: hotelId ? { hotelId: Number(hotelId) } : {},
        select: { rating: true, tags: true },
      }),
    ]);

    const feedbacks = rawFeedbacks.map((f) => ({
      ...f,
      customerName: f.customerName || f.order?.customerName || "Guest Diner",
      customerPhone: f.customerPhone || f.order?.customerPhone || "—",
    }));

    // Calculate analytics
    const total = allForStats.length;
    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let ratingSum = 0;
    const tagCounts: Record<string, number> = {};

    allForStats.forEach((f) => {
      ratingSum += f.rating;
      distribution[f.rating] = (distribution[f.rating] || 0) + 1;
      if (f.tags) {
        f.tags.split(",").forEach((rawTag) => {
          const t = rawTag.trim();
          if (t) {
            tagCounts[t] = (tagCounts[t] || 0) + 1;
          }
        });
      }
    });

    const avgRating = total > 0 ? (ratingSum / total).toFixed(1) : "5.0";
    const positiveReviews = (distribution[5] || 0) + (distribution[4] || 0);
    const positivePercentage = total > 0 ? Math.round((positiveReviews / total) * 100) : 100;

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      feedbacks,
      stats: {
        total,
        avgRating,
        positivePercentage,
        distribution,
        topTags,
      },
    });
  } catch (err: unknown) {
    console.error("Failed to get feedbacks:", err);
    return NextResponse.json({ error: "Failed to fetch feedbacks" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.feedback.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Failed to delete feedback:", err);
    return NextResponse.json({ error: "Failed to delete feedback" }, { status: 500 });
  }
}
