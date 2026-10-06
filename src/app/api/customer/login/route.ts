import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, name } = body;

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Mobile number is required." },
        { status: 400 }
      );
    }

    const cleanPhone = phone.replace(/\s+/g, "");
    const digits = phone.replace(/\D/g, "");

    if (digits.length < 10) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    const last10 = digits.slice(-10);
    const normalizedPhone = digits.length === 10 ? `+91${digits}` : `+${digits}`;

    // Find existing customer or create new
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          { phone: normalizedPhone },
          { phone: { contains: last10 } },
        ],
      },
    });

    const trimmedName = typeof name === "string" ? name.trim() : "";

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          phone: normalizedPhone,
          name: trimmedName || "Guest Diner",
        },
      });
    } else if (trimmedName && customer.name !== trimmedName && trimmedName !== "Guest Diner") {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { name: trimmedName },
      });
    }

    // Check if this mobile number has an active live order on ANY table
    const liveOrder = await prisma.order.findFirst({
      where: {
        customerId: customer.id,
        status: { in: ["PENDING", "ACCEPTED", "PREPARING", "READY", "SERVED"] },
      },
      include: {
        table: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const targetTableToken = body.tableToken ? String(body.tableToken).trim() : null;

    if (liveOrder && liveOrder.table && targetTableToken && liveOrder.table.qrCodeToken !== targetTableToken) {
      // Mobile number is strictly locked to liveOrder.table!
      return NextResponse.json(
        {
          error: `Your mobile number has an active order (#${liveOrder.orderNumber}) at ${liveOrder.table.tableNumber}. You cannot switch or place orders at another table while food is in tracking.`,
          hasActiveOrderOnDifferentTable: true,
          activeOrderNumber: liveOrder.orderNumber,
          activeTableNumber: liveOrder.table.tableNumber,
          activeTableToken: liveOrder.table.qrCodeToken,
          activeOrderStatus: liveOrder.status,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
      },
      activeOrder: liveOrder && liveOrder.table ? {
        orderNumber: liveOrder.orderNumber,
        tableNumber: liveOrder.table.tableNumber,
        tableToken: liveOrder.table.qrCodeToken,
        status: liveOrder.status,
      } : null,
    });
  } catch (error) {
    console.error("API POST /api/customer/login error:", error);
    return NextResponse.json(
      { error: "Failed to log in. Please try again." },
      { status: 500 }
    );
  }
}
