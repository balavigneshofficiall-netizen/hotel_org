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

async function runTest() {
  console.log("==================================================");
  console.log("🧪 TESTING PARTIAL ORDER ITEM DISMISSAL / REJECTION");
  console.log("==================================================\n");

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const hotel = await prisma.hotel.findFirst();
    const table = await prisma.hotelTable.findFirst({ where: { hotelId: hotel.id } });

    // Step 1: Create a test session
    const sessionCode = `SES-TEST-${Date.now().toString().slice(-4)}`;
    const session = await prisma.session.create({
      data: {
        hotelId: hotel.id,
        tableId: table.id,
        sessionCode,
        isActive: true,
      },
    });
    console.log(`✅ Step 1: Created test session ${session.sessionCode} (ID: ${session.id})`);

    // Step 2: Create an order with 2 items
    const orderNumber = `ORD-TEST-${Date.now().toString().slice(-4)}`;
    const order = await prisma.order.create({
      data: {
        hotelId: hotel.id,
        tableId: table.id,
        sessionId: session.id,
        orderNumber,
        customerName: "Test Diner",
        customerPhone: "9876543210",
        status: "PENDING",
        taxRate: 5.0,
        subtotal: 270.0,
        taxAmount: 13.5,
        discountAmount: 0.0,
        totalAmount: 283.5,
        items: {
          create: [
            {
              productName: "Chettinad Chicken Biryani",
              unitPrice: 220.0,
              quantity: 1,
              subtotal: 220.0,
              isVeg: false,
              isCancelled: false,
            },
            {
              productName: "Kerala Malabar Parotta",
              unitPrice: 50.0,
              quantity: 1,
              subtotal: 50.0,
              isVeg: true,
              isCancelled: false,
            },
          ],
        },
      },
      include: { items: true },
    });
    console.log(`✅ Step 2: Created order #${order.orderNumber} with 2 items:`);
    order.items.forEach(i => console.log(`   - ${i.productName}: ₹${i.subtotal} (isCancelled: ${i.isCancelled})`));
    console.log(`   Original Order Total: ₹${order.totalAmount} (Subtotal ₹${order.subtotal} + Tax ₹${order.taxAmount})`);

    // Step 3: Admin dismisses ONLY Item 2 ("Kerala Malabar Parotta") via PATCH /api/admin/orders
    console.log(`\n⏳ Step 3: Admin marks 'Kerala Malabar Parotta' as out of stock (இல்ல)...`);
    const patchRes = await request('PATCH', '/api/admin/orders', {
      orderId: order.id,
      unavailableItems: ["Kerala Malabar Parotta"],
      note: "⚠️ Dish Unavailable: Kerala Malabar Parotta is out of stock (removed from bill). Remaining dishes confirmed & cooking fresh!",
    });

    console.log(`   PATCH response HTTP status: ${patchRes.status}`);
    if (patchRes.status !== 200) {
      console.error("PATCH failed:", patchRes);
      process.exit(1);
    }

    // Step 4: Verify Order state in DB
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true, statusHistory: true, notifications: true },
    });

    console.log(`\n🔍 Step 4: Verifying Updated Order in DB:`);
    console.log(`   - Order Status: ${updatedOrder.status} (EXPECTED: ACCEPTED, NOT CANCELLED)`);
    if (updatedOrder.status !== "ACCEPTED") {
      throw new Error(`Expected status ACCEPTED, but got ${updatedOrder.status}`);
    }

    const itemA = updatedOrder.items.find(i => i.productName === "Chettinad Chicken Biryani");
    const itemB = updatedOrder.items.find(i => i.productName === "Kerala Malabar Parotta");

    console.log(`   - Item A (${itemA.productName}) isCancelled: ${itemA.isCancelled} (EXPECTED: false)`);
    console.log(`   - Item B (${itemB.productName}) isCancelled: ${itemB.isCancelled} (EXPECTED: true)`);
    if (itemA.isCancelled !== false || itemB.isCancelled !== true) {
      throw new Error("Item cancellation flags did not match expected values!");
    }

    console.log(`   - Recalculated Subtotal: ₹${updatedOrder.subtotal} (EXPECTED: 220)`);
    console.log(`   - Recalculated Tax: ₹${updatedOrder.taxAmount} (EXPECTED: 11)`);
    console.log(`   - Recalculated Total: ₹${updatedOrder.totalAmount} (EXPECTED: 231)`);
    if (updatedOrder.subtotal !== 220 || updatedOrder.totalAmount !== 231) {
      throw new Error(`Order totals were not recalculated correctly! Subtotal: ${updatedOrder.subtotal}, Total: ${updatedOrder.totalAmount}`);
    }

    console.log(`   - Status History Note: "${updatedOrder.statusHistory[0]?.note}"`);

    // Step 5: Verify Session API (/api/sessions/[id])
    console.log(`\n🔍 Step 5: Testing Customer Session API (/api/sessions/${session.id}):`);
    const sessionRes = await request('GET', `/api/sessions/${session.id}`);
    const sessionApiData = sessionRes.data;

    console.log(`   - Combined Total in Session: ₹${sessionApiData.combined.totalAmount} (EXPECTED: 231)`);
    console.log(`   - Combined Item Count in Session: ${sessionApiData.combined.itemCount} (EXPECTED: 1 active dish)`);
    console.log(`   - Items returned: ${sessionApiData.allItems.map(i => i.productName).join(', ')}`);

    if (sessionApiData.combined.totalAmount !== 231 || sessionApiData.combined.itemCount !== 1) {
      throw new Error("Session API returned incorrect combined totals or included cancelled item!");
    }
    if (sessionApiData.allItems.some(i => i.productName.includes("Parotta"))) {
      throw new Error("Session API allItems still contains cancelled Parotta!");
    }

    // Step 6: Verify Bill API (/api/bills/[orderId])
    console.log(`\n🔍 Step 6: Testing Printable Bill API (/api/bills/${order.id}):`);
    const billRes = await request('GET', `/api/bills/${order.id}`);
    const billData = billRes.data.bill;

    console.log(`   - Bill Grand Total: ₹${billData.grandTotal} (EXPECTED: 231)`);
    console.log(`   - Bill Items Count: ${billData.order.items.length} (EXPECTED: 1 active dish)`);
    console.log(`   - Bill Items: ${billData.order.items.map(i => i.productName).join(', ')}`);

    if (billData.grandTotal !== 231 || billData.order.items.length !== 1) {
      throw new Error("Bill API returned incorrect grand total or items count!");
    }

    // Clean up test data
    await prisma.notification.deleteMany({ where: { orderId: order.id } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: order.id } });
    await prisma.bill.deleteMany({ where: { orderId: order.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
    await prisma.order.deleteMany({ where: { id: order.id } });
    await prisma.session.deleteMany({ where: { id: session.id } });

    console.log("\n==================================================");
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! 100% VERIFIED!");
    console.log("==================================================");
  } finally {
    await prisma.$disconnect();
  }
}

runTest().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
