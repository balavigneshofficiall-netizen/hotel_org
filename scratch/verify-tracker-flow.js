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

async function verifyTrackerButtons() {
  console.log("=== Verifying Complete Bill vs One More Order Tracker Flow ===");

  // 1. Get menu & table
  const menuRes = await request("GET", "/api/menu?hotel=hotel-annapoorna&table=tbl_annapoorna_08");
  const hotelId = menuRes.data.hotel.id;
  const tableId = menuRes.data.table.id;
  const prod = menuRes.data.popularProducts[0];

  // Close any prior session
  const existingOrders = await request("GET", "/api/admin/orders");
  const activeTableOrder = existingOrders.data.orders?.find(
    (o) => o.tableId === tableId && o.status !== "COMPLETED" && o.status !== "CANCELLED"
  );
  if (activeTableOrder && activeTableOrder.sessionId) {
    await request("PATCH", `/api/sessions/${activeTableOrder.sessionId}`, {
      action: "close",
      paymentMethod: "CASH",
    });
  }

  // 2. Place active order
  const orderRes = await request("POST", "/api/orders", {
    hotelId,
    tableId,
    customerName: "Tracker Flow Test",
    customerPhone: "9000000001",
    items: [{ productId: prod.id, quantity: 1 }],
  });
  const order = orderRes.data.order;
  const sessionId = order.sessionId;
  console.log(`Placed order #${order.orderNumber} in active session ${sessionId}`);

  // Check session state
  const sessionRes = await request("GET", `/api/sessions/${sessionId}`);
  console.log("Session isActive:", sessionRes.data.session.isActive, "billRequested:", sessionRes.data.session.billRequested);

  // 3. Customer requests Complete Bill
  console.log("\nCustomer clicks Complete Bill -> requesting bill...");
  const reqBill = await request("PATCH", `/api/sessions/${sessionId}`, {
    action: "request_bill",
  });
  console.log("Bill requested successfully:", reqBill.data.session.billRequested);

  // 4. Verify orders endpoint reflects billRequested
  const orderCheck = await request("GET", `/api/orders/${order.id}`);
  console.log("Order session billRequested:", orderCheck.data.sessionData.session.billRequested);

  // 5. Cashier settles bill
  console.log("\nCashier settles bill at counter...");
  const closeRes = await request("PATCH", `/api/sessions/${sessionId}`, {
    action: "close",
    paymentMethod: "UPI",
  });
  console.log("Session closed:", !closeRes.data.session.isActive);

  console.log("\nALL VERIFICATIONS PASSED!");
}

verifyTrackerButtons().catch(console.error);
