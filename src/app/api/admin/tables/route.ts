import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TableStatus } from "@prisma/client";
import os from "os";

export const dynamic = "force-dynamic";

function getLocalIpAddress(): string {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
  } catch {}
  return "127.0.0.1";
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hotelSlug = searchParams.get("hotel") || "hotel-annapoorna";

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug },
      select: { id: true, slug: true, name: true, currency: true },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    const tables = await prisma.hotelTable.findMany({
      where: { hotelId: hotel.id },
      include: {
        orders: {
          where: {
            status: { in: ["PENDING", "ACCEPTED", "PREPARING", "READY", "SERVED"] },
          },
          orderBy: { createdAt: "desc" },
          include: {
            items: true,
          },
        },
      },
      orderBy: { tableNumber: "asc" },
    });

    const enrichedTables = tables.map((tbl) => {
      const activeOrders = tbl.orders || [];
      const occupiedSeats = activeOrders.reduce((sum, o) => sum + (o.guestCount || 1), 0);
      const cap = tbl.capacity || 4;
      const availableSeats = Math.max(0, cap - occupiedSeats);
      const isOccupied = availableSeats === 0 || tbl.status === "OCCUPIED";

      const primaryOrder = activeOrders[0] || null;

      return {
        id: tbl.id,
        tableNumber: tbl.tableNumber,
        capacity: cap,
        occupiedSeats,
        availableSeats,
        activeOrdersCount: activeOrders.length,
        floor: tbl.floor || "Main Dining",
        qrCodeToken: tbl.qrCodeToken,
        status: isOccupied ? "OCCUPIED" : tbl.status,
        activeOrder: primaryOrder
          ? {
              id: primaryOrder.id,
              orderNumber: primaryOrder.orderNumber,
              customerName: primaryOrder.customerName,
              customerPhone: primaryOrder.customerPhone,
              guestCount: primaryOrder.guestCount || 1,
              totalAmount: primaryOrder.totalAmount,
              status: primaryOrder.status,
              createdAt: primaryOrder.createdAt,
              itemsCount: primaryOrder.items.reduce((s, i) => s + i.quantity, 0),
            }
          : null,
        activeOrders: activeOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          guestCount: o.guestCount || 1,
          totalAmount: o.totalAmount,
          status: o.status,
          createdAt: o.createdAt,
          itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
          sessionId: o.sessionId,
          externalOrderId: o.externalOrderId,
        })),
      };
    });

    const localIp = getLocalIpAddress();
    const port = process.env.PORT || "3000";
    const hostHeader = request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const networkBaseUrl = hostHeader && !hostHeader.includes("localhost") && !hostHeader.includes("127.0.0.1")
      ? `${proto}://${hostHeader}`
      : `http://${localIp}:${port}`;

    return NextResponse.json({
      tables: enrichedTables,
      hotel,
      serverIp: localIp,
      networkBaseUrl,
    });
  } catch (err: unknown) {
    console.error("Admin tables get error:", err);
    return NextResponse.json({ error: "Failed to load tables" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableId, action, status, capacity } = body;

    if (!tableId) {
      return NextResponse.json({ error: "tableId is required" }, { status: 400 });
    }

    const numTableId = Number(tableId);

    if (capacity !== undefined || body.tableNumber !== undefined || body.floor !== undefined) {
      const updateData: any = {};
      if (capacity !== undefined) updateData.capacity = Math.max(1, Number(capacity));
      if (body.tableNumber) updateData.tableNumber = String(body.tableNumber).trim();
      if (body.floor !== undefined) updateData.floor = String(body.floor).trim();

      const updated = await prisma.hotelTable.update({
        where: { id: numTableId },
        data: updateData,
      });
      return NextResponse.json({ table: updated, success: true });
    }

    if (action === "RESET_TABLE") {
      // Mark table available
      const updated = await prisma.hotelTable.update({
        where: { id: numTableId },
        data: { status: TableStatus.AVAILABLE },
      });
      return NextResponse.json({ table: updated, success: true });
    }

    if (status) {
      const updated = await prisma.hotelTable.update({
        where: { id: numTableId },
        data: { status: status as TableStatus },
      });
      return NextResponse.json({ table: updated, success: true });
    }

    return NextResponse.json({ error: "No valid action provided" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Admin table patch error:", err);
    return NextResponse.json({ error: "Failed to update table" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hotelSlug = "hotel-annapoorna", tableNumber, capacity = 4, floor = "Main Dining" } = body;

    const hotel = await prisma.hotel.findUnique({ where: { slug: hotelSlug } });
    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    const cleanNum = tableNumber.replace(/\D/g, "") || "01";
    const qrCodeToken = `tbl_${hotel.slug.replace(/-/g, "_")}_${cleanNum.padStart(2, "0")}`;

    const newTable = await prisma.hotelTable.create({
      data: {
        hotelId: hotel.id,
        tableNumber: tableNumber.startsWith("Table") ? tableNumber : `Table ${tableNumber}`,
        capacity: Number(capacity),
        floor,
        qrCodeToken,
      },
    });

    return NextResponse.json({ table: newTable, success: true });
  } catch (err: unknown) {
    console.error("Admin table post error:", err);
    return NextResponse.json({ error: "Failed to create table" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tableId = searchParams.get("id");

    if (!tableId) {
      return NextResponse.json({ error: "Table ID is required" }, { status: 400 });
    }

    const numId = Number(tableId);

    // Check if table has active orders
    const activeOrders = await prisma.order.count({
      where: {
        tableId: numId,
        status: { in: ["PENDING", "ACCEPTED", "PREPARING", "READY", "SERVED"] },
      },
    });

    if (activeOrders > 0) {
      return NextResponse.json(
        { error: "Cannot delete table with active orders. Complete or cancel orders first." },
        { status: 400 }
      );
    }

    // Delete associated non-active orders or disassociate them before deleting table if needed,
    // or simply delete table (if relations allow cascade, or delete orders first)
    await prisma.order.deleteMany({
      where: { tableId: numId },
    });

    await prisma.hotelTable.delete({
      where: { id: numId },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Admin table delete error:", err);
    return NextResponse.json({ error: "Failed to delete table" }, { status: 500 });
  }
}
