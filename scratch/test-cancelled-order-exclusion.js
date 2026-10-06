const http = require("http");

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: "localhost",
        port: 3000,
        path,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(dataString ? { "Content-Length": Buffer.byteLength(dataString) } : {}),
        },
      },
      (res) => {
        let resBody = "";
        res.on("data", (chunk) => (resBody += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data: JSON.parse(resBody) });
          } catch {
            resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, raw: resBody });
          }
        });
      }
    );
    req.on("error", reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function testCancelledOrderExclusionFlow() {
  console.log("=== Testing Cancelled Order Exclusion from Bill ===");
  const testPhone = "9887766554";

  // 1. Fetch hotel and menu to get products
  const menuRes = await request("GET", "/api/menu?hotel=hotel-annapoorna&table=tbl_annapoorna_08");
  const hotelId = menuRes.data.hotel.id;
  const tableId = menuRes.data.table.id;
  const products = menuRes.data.popularProducts || menuRes.data.categories[0].products;
  const prod1 = products[0];
  const prod2 = products[1] || products[0];

  console.log(`Hotel: ${menuRes.data.hotel.name}, Table: ${menuRes.data.table.tableNumber}`);
  console.log(`Product 1: ${prod1.name} (Rs. ${prod1.price})`);
  console.log(`Product 2: ${prod2.name} (Rs. ${prod2.price})`);

  // Close any prior session on table
  const existingOrders = await request("GET", "/api/admin/orders");
  const activeTableOrder = existingOrders.data.orders?.find(
    (o) => o.tableId === tableId && o.status !== "COMPLETED" && o.status !== "CANCELLED"
  );
  if (activeTableOrder && activeTableOrder.sessionId) {
    console.log("Closing prior active session on table:", activeTableOrder.sessionId);
    await request("PATCH", `/api/sessions/${activeTableOrder.sessionId}`, {
      action: "close",
      paymentMethod: "CASH",
    });
  }

  // 2. Place Order Batch 1
  const batch1Res = await request("POST", "/api/orders", {
    hotelId,
    tableId,
    customerName: "Dinesh Kumar",
    customerPhone: testPhone,
    items: [{ productId: prod1.id, quantity: 2 }],
  });
  const order1 = batch1Res.data.order;
  const sessionId = order1.sessionId;
  console.log(`\nPlaced Batch 1: Order #${order1.orderNumber} in Session ${sessionId}, Amount: Rs. ${order1.totalAmount}`);

  // 3. Place Order Batch 2 in the same session
  const batch2Res = await request("POST", "/api/orders", {
    hotelId,
    tableId,
    sessionId,
    customerName: "Dinesh Kumar",
    customerPhone: testPhone,
    items: [{ productId: prod2.id, quantity: 1 }],
  });
  const order2 = batch2Res.data.order;
  console.log(`Placed Batch 2: Order #${order2.orderNumber} in Session ${sessionId}, Amount: Rs. ${order2.totalAmount}`);

  // Check session combined totals before cancellation
  let sessionRes = await request("GET", `/api/sessions/${sessionId}`);
  console.log(`Before cancellation - Combined Total: Rs. ${sessionRes.data.combined.totalAmount}, Orders: ${sessionRes.data.combined.orderCount}`);

  // 4. Admin Cancels Batch 2 (Dish Unavailable)
  console.log(`\nAdmin cancelling Order Batch 2 #${order2.orderNumber}...`);
  const cancelRes = await request("PATCH", "/api/admin/orders", {
    orderId: order2.id,
    status: "CANCELLED",
    note: `Dish Unavailable: ${prod2.name} is out of stock.`,
  });
  console.log(`Order 2 status is now: ${cancelRes.data.status}`);

  // 5. Verify session GET after cancellation
  sessionRes = await request("GET", `/api/sessions/${sessionId}`);
  const combined = sessionRes.data.combined;
  console.log(`\nAfter cancellation - Combined Total: Rs. ${combined.totalAmount}, Subtotal: Rs. ${combined.subtotal}`);
  console.log(`After cancellation - Valid Orders Count: ${combined.orderCount}, Dishes: ${combined.itemCount}`);
  console.log(`Items in combined bill:`, sessionRes.data.allItems.map(i => i.productName));

  if (Math.abs(combined.totalAmount - order1.totalAmount) > 0.01) {
    throw new Error(`FAIL: Session total Rs. ${combined.totalAmount} does NOT equal Order 1 total Rs. ${order1.totalAmount}! Cancelled order was still included!`);
  }
  if (combined.orderCount !== 1) {
    throw new Error(`FAIL: Order count is ${combined.orderCount}, expected 1!`);
  }
  if (sessionRes.data.allItems.some(i => i.productName.includes(prod2.name))) {
    throw new Error(`FAIL: Cancelled dish ${prod2.name} still found in combined bill allItems!`);
  }
  console.log("--> PASS: Session GET correctly excluded cancelled order from totals and items list!");

  // 6. Verify Bill API for Order 1
  const billRes = await request("GET", `/api/bills/${order1.id}`);
  console.log(`\nBill API Grand Total: Rs. ${billRes.data.bill.grandTotal}`);
  console.log(`Bill API Items Count: ${billRes.data.bill.order.items.length}`);

  if (Math.abs(billRes.data.bill.grandTotal - order1.totalAmount) > 0.01) {
    throw new Error(`FAIL: Bill API grandTotal Rs. ${billRes.data.bill.grandTotal} does NOT equal Order 1 total Rs. ${order1.totalAmount}!`);
  }
  if (billRes.data.bill.order.items.some(i => i.productName.includes(prod2.name))) {
    throw new Error(`FAIL: Cancelled item found in digital bill items!`);
  }
  console.log("--> PASS: Bill API correctly excluded cancelled order from grandTotal and bill invoice items!");

  // 7. Settle Counter Bill
  console.log("\nClosing session and settling counter bill with CASH...");
  const closeRes = await request("PATCH", `/api/sessions/${sessionId}`, {
    action: "close",
    paymentMethod: "CASH",
  });
  console.log(`Session close status: ${closeRes.data.session.isActive ? "ACTIVE" : "CLOSED"}`);

  // 8. Verify Customer History API
  const histRes = await request("GET", `/api/history?phone=${testPhone}`);
  const histSession = histRes.data.sessions.find(s => s.sessionId === sessionId);
  console.log(`\nHistory Session Total: Rs. ${histSession?.totalAmount}, Dishes: ${histSession?.totalDishesCount}`);

  if (histSession && Math.abs(histSession.totalAmount - order1.totalAmount) > 0.01) {
    throw new Error(`FAIL: History session total Rs. ${histSession.totalAmount} included cancelled order!`);
  }
  console.log("--> PASS: History API correctly excluded cancelled order from customer dining history!");

  console.log("\n==================================================================");
  console.log("ALL TESTS PASSED! Cancelled orders are completely excluded from all bills, invoices, totals, and counts!");
  console.log("==================================================================");
}

testCancelledOrderExclusionFlow().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
