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
  console.log("🧪 TESTING SEQUENTIAL SES-001, ORD-001 & MULTI-ORDER BILL");
  console.log("==================================================\n");

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const hotel = await prisma.hotel.findFirst();
    const tables = await prisma.hotelTable.findMany({ where: { hotelId: hotel.id } });
    const products = await prisma.product.findMany({ where: { hotelId: hotel.id } });

    const table1 = tables[0];
    const table2 = tables[1];
    const prod1 = products[0];
    const prod2 = products[1] || products[0];
    const prod3 = products[2] || products[0];

    console.log(`Using Hotel: ${hotel.name} (Table: ${table1.tableNumber})`);

    // 1. Place First Order via API -> should create SES-001 and ORD-001
    console.log("\n--- Placing Order 1 on Table 1 ---");
    const res1 = await request('POST', '/api/orders', {
      hotelId: hotel.id,
      tableId: table1.id,
      customerName: "Vignesh",
      customerPhone: "9876543210",
      items: [{ productId: prod1.id, quantity: 1 }],
    });

    console.log(`Order 1 Response HTTP: ${res1.status}`);
    if (res1.status !== 200) {
      console.error("Order 1 failed:", res1);
      process.exit(1);
    }
    const order1 = res1.data.order;
    console.log(`✅ Order 1 Number: ${order1.orderNumber} (EXPECTED: ORD-001)`);
    console.log(`✅ Session 1 Code: ${order1.session.sessionCode} (EXPECTED: SES-001)`);

    if (order1.orderNumber !== "ORD-001") {
      throw new Error(`Expected ORD-001, got ${order1.orderNumber}`);
    }
    if (order1.session.sessionCode !== "SES-001") {
      throw new Error(`Expected SES-001, got ${order1.session.sessionCode}`);
    }

    // 2. Place Second Order in same session -> should be ORD-002 in SES-001
    console.log("\n--- Placing Order 2 (One More Order) on Table 1 in SES-001 ---");
    const res2 = await request('POST', '/api/orders', {
      hotelId: hotel.id,
      tableId: table1.id,
      customerName: "Vignesh",
      customerPhone: "9876543210",
      items: [{ productId: prod2.id, quantity: 2 }],
    });

    const order2 = res2.data.order;
    console.log(`✅ Order 2 Number: ${order2.orderNumber} (EXPECTED: ORD-002)`);
    console.log(`✅ Session Code: ${order2.session.sessionCode} (EXPECTED: SES-001)`);

    if (order2.orderNumber !== "ORD-002") {
      throw new Error(`Expected ORD-002, got ${order2.orderNumber}`);
    }
    if (order2.session.sessionCode !== "SES-001") {
      throw new Error(`Expected SES-001, got ${order2.session.sessionCode}`);
    }

    // 3. Place Third Order in same session -> should be ORD-003 in SES-001
    console.log("\n--- Placing Order 3 (Dessert batch) on Table 1 in SES-001 ---");
    const res3 = await request('POST', '/api/orders', {
      hotelId: hotel.id,
      tableId: table1.id,
      customerName: "Vignesh",
      customerPhone: "9876543210",
      items: [{ productId: prod3.id, quantity: 1 }],
    });

    const order3 = res3.data.order;
    console.log(`✅ Order 3 Number: ${order3.orderNumber} (EXPECTED: ORD-003)`);
    console.log(`✅ Session Code: ${order3.session.sessionCode} (EXPECTED: SES-001)`);

    if (order3.orderNumber !== "ORD-003") {
      throw new Error(`Expected ORD-003, got ${order3.orderNumber}`);
    }

    // 4. Test Bill API for multi-order session
    console.log("\n--- Testing Multi-Order Consolidated Bill API ---");
    const billRes = await request('GET', `/api/bills/${order1.id}`);
    const bill = billRes.data.bill;

    console.log(`✅ Bill Number: ${bill.billNumber}`);
    console.log(`✅ Bill Session Code: ${bill.sessionCode} (EXPECTED: SES-001)`);
    console.log(`✅ Bill Order Batches: ${bill.orderNumbers.join(', ')} (EXPECTED: ORD-001, ORD-002, ORD-003)`);
    console.log(`✅ Total Items in Bill: ${bill.order.items.length}`);

    // Check item names are clean and do NOT have messy prefixes
    for (const item of bill.order.items) {
      console.log(`   - ${item.productName} (Qty: ${item.quantity}, Subtotal: ₹${item.subtotal}, Batch: #${item.orderNumber})`);
      if (item.productName.includes("(#ORD-")) {
        throw new Error(`Product name '${item.productName}' contains messy (#ORD-) suffix!`);
      }
    }

    if (!bill.orderNumbers || bill.orderNumbers.length !== 3) {
      throw new Error(`Expected 3 orderNumbers in bill, got ${bill.orderNumbers?.length}`);
    }

    // 5. Test another table creates SES-002 and ORD-004
    console.log("\n--- Placing Order on Table 2 (New Session) ---");
    const resTable2 = await request('POST', '/api/orders', {
      hotelId: hotel.id,
      tableId: table2.id,
      customerName: "Karthik",
      customerPhone: "9876543211",
      items: [{ productId: prod1.id, quantity: 1 }],
    });

    const orderTable2 = resTable2.data.order;
    console.log(`✅ Order on Table 2 Number: ${orderTable2.orderNumber} (EXPECTED: ORD-004)`);
    console.log(`✅ Session on Table 2 Code: ${orderTable2.session.sessionCode} (EXPECTED: SES-002)`);

    if (orderTable2.orderNumber !== "ORD-004") {
      throw new Error(`Expected ORD-004, got ${orderTable2.orderNumber}`);
    }
    if (orderTable2.session.sessionCode !== "SES-002") {
      throw new Error(`Expected SES-002, got ${orderTable2.session.sessionCode}`);
    }

    console.log("\n==================================================");
    console.log("🎉 ALL TESTS PASSED! SES-001, ORD-001 & CLEAN BILL VERIFIED 100%!");
    console.log("==================================================");
  } finally {
    await prisma.$disconnect();
  }
}

runTest().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
