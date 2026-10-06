const http = require('http');

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAllItemsUnavailable() {
  console.log("==================================================");
  console.log("🧪 TESTING ALL ITEMS UNAVAILABLE -> FULL CANCEL");
  console.log("==================================================\n");

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const hotel = await prisma.hotel.findFirst();
    const table = await prisma.hotelTable.findFirst({ where: { hotelId: hotel.id } });

    const orderNumber = `ORD-FULL-CANCEL-${Date.now().toString().slice(-4)}`;
    const order = await prisma.order.create({
      data: {
        hotelId: hotel.id,
        tableId: table.id,
        orderNumber,
        customerName: "All Unavailable Diner",
        customerPhone: "9876543210",
        status: "PENDING",
        taxRate: 5.0,
        subtotal: 100.0,
        taxAmount: 5.0,
        discountAmount: 0.0,
        totalAmount: 105.0,
        items: {
          create: [
            {
              productName: "Dish One",
              unitPrice: 50.0,
              quantity: 1,
              subtotal: 50.0,
              isCancelled: false,
            },
            {
              productName: "Dish Two",
              unitPrice: 50.0,
              quantity: 1,
              subtotal: 50.0,
              isCancelled: false,
            },
          ],
        },
      },
    });

    // Mark BOTH dishes unavailable
    const patchRes = await request('PATCH', '/api/admin/orders', {
      orderId: order.id,
      unavailableItems: ["Dish One", "Dish Two"],
    });

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });

    console.log(`- Order status: ${updated.status} (EXPECTED: CANCELLED)`);
    if (updated.status !== "CANCELLED") {
      throw new Error(`Expected CANCELLED, got ${updated.status}`);
    }

    console.log(`- Item 1 isCancelled: ${updated.items[0].isCancelled}`);
    console.log(`- Item 2 isCancelled: ${updated.items[1].isCancelled}`);
    if (!updated.items[0].isCancelled || !updated.items[1].isCancelled) {
      throw new Error(`Both items should be marked cancelled!`);
    }

    // Clean up
    await prisma.notification.deleteMany({ where: { orderId: order.id } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: order.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
    await prisma.order.deleteMany({ where: { id: order.id } });

    console.log("\n✅ FULL CANCELLATION TEST PASSED!");
  } finally {
    await prisma.$disconnect();
  }
}

testAllItemsUnavailable().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
