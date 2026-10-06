import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    const cleanTable = decodeURIComponent(table);

    const orders = await prisma.order.findMany({
      where: {
        table: {
          OR: [
            { tableNumber: cleanTable },
            { tableNumber: `Table ${cleanTable}` },
            { qrCodeToken: cleanTable },
          ],
        },
      },
      include: {
        items: true,
        table: true,
        bill: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ success: true, table: cleanTable, orders });
  } catch (error) {
    return NextResponse.json({ success: true, orders: [] });
  }
}
