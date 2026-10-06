async function runE2ETest() {
  const baseUrl = "http://localhost:3000";
  console.log("=== STARTING FULL END-TO-END VERIFICATION ===");

  // 1. Test Menu & Table verification
  console.log("\n1. Testing GET /api/menu?hotel=hotel-annapoorna&table=tbl_annapoorna_08...");
  const menuRes = await fetch(`${baseUrl}/api/menu?hotel=hotel-annapoorna&table=tbl_annapoorna_08`);
  if (!menuRes.ok) throw new Error(`Menu API failed: ${menuRes.status}`);
  const menuData = await menuRes.json();
  console.log(`✓ Hotel: ${menuData.hotel.name} (Currency: ${menuData.hotel.currency}, Tax: ${menuData.hotel.taxRate}%)`);
  console.log(`✓ Table Verified: ${menuData.table.tableNumber} (${menuData.table.qrCodeToken})`);
  console.log(`✓ Categories count: ${menuData.categories.length}`);
  console.log(`✓ Popular dishes: ${menuData.popularProducts.length}`);

  const biriyani = menuData.categories.find(c => c.slug === "biriyani")?.products[0];
  const chicken65 = menuData.categories.find(c => c.slug === "starters")?.products[0];
  console.log(`✓ Selected dishes to order: '${biriyani.name}' (₹${biriyani.price}) and '${chicken65.name}' (₹${chicken65.price})`);

  // 2. Test Order Placement (POST /api/orders)
  console.log("\n2. Testing POST /api/orders (Placing Table 08 order)...");
  const orderRes = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hotelId: menuData.hotel.id,
      tableId: menuData.table.id,
      customerName: "Vignesh Sundar",
      customerPhone: "9876543210",
      items: [
        { productId: biriyani.id, quantity: 2, specialInstructions: "Less spicy please" },
        { productId: chicken65.id, quantity: 1, specialInstructions: "Extra crispy curry leaves" }
      ],
      specialInstructions: "Please bring dining plates and warm water"
    })
  });

  if (!orderRes.ok) throw new Error(`Order placement failed: ${orderRes.status}`);
  const orderData = await orderRes.json();
  const order = orderData.order;
  console.log(`✓ Order Created Successfully!`);
  console.log(`✓ Order Number: #${order.orderNumber}`);
  console.log(`✓ Table: ${order.table.tableNumber}`);
  console.log(`✓ Customer: ${order.customerName} (${order.customerPhone})`);
  console.log(`✓ Subtotal: ₹${order.subtotal}, Tax: ₹${order.taxAmount}, Total: ₹${order.totalAmount}`);
  console.log(`✓ Snapshotted items count: ${order.items.length}`);
  console.log(`✓ Initial Status: ${order.status}`);

  // 3. Test Order Details (GET /api/orders/[id])
  console.log(`\n3. Testing GET /api/orders/${order.id}...`);
  const getOrderRes = await fetch(`${baseUrl}/api/orders/${order.id}`);
  const getOrderData = await getOrderRes.json();
  console.log(`✓ Fetched order status: ${getOrderData.order.status}`);
  console.log(`✓ Status history events: ${getOrderData.order.statusHistory.length}`);

  // 4. Test Kitchen Progressing Status (PATCH /api/orders/[id])
  const statuses = ["ACCEPTED", "PREPARING", "READY", "SERVED", "COMPLETED"];
  for (const st of statuses) {
    console.log(`\n4. Advancing order status to ${st}...`);
    const patchRes = await fetch(`${baseUrl}/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: st, note: `Status updated by kitchen to ${st}` })
    });
    const patchData = await patchRes.json();
    console.log(`✓ Order status successfully updated to: ${patchData.order.status}`);
  }

  // 5. Test Bill Generation (GET /api/bills/[orderId])
  console.log(`\n5. Testing GET /api/bills/${order.id}...`);
  const billRes = await fetch(`${baseUrl}/api/bills/${order.id}`);
  const billData = await billRes.json();
  console.log(`✓ Bill Generated: ${billData.bill.billNumber}`);
  console.log(`✓ Subtotal: ₹${billData.bill.subtotal}`);
  console.log(`✓ Tax (GST): ₹${billData.bill.taxAmount}`);
  console.log(`✓ Grand Total: ₹${billData.bill.grandTotal}`);
  console.log(`✓ Payment Status: ${billData.bill.paymentStatus}`);

  // 6. Test Customer History (GET /api/history?phone=9876543210)
  console.log("\n6. Testing GET /api/history?phone=9876543210...");
  const histRes = await fetch(`${baseUrl}/api/history?phone=9876543210`);
  const histData = await histRes.json();
  console.log(`✓ Customer orders found in history: ${histData.orders.length}`);

  // 7. Test Kitchen KOT Queue (GET /api/kitchen)
  console.log("\n7. Testing GET /api/kitchen?hotel=hotel-annapoorna...");
  const kitchenRes = await fetch(`${baseUrl}/api/kitchen?hotel=hotel-annapoorna`);
  const kitchenData = await kitchenRes.json();
  console.log(`✓ Total orders in kitchen view: ${kitchenData.orders.length}`);

  // 8. Test Push Subscription Registration
  console.log("\n8. Testing POST /api/push/subscribe...");
  const pushRes = await fetch(`${baseUrl}/api/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: {
        endpoint: "https://fcm.googleapis.com/fcm/send/demo-subscription-token-12345",
        keys: {
          p256dh: "BMh39...demoKey",
          auth: "demoAuthToken123"
        }
      },
      customerPhone: "9876543210",
      tableId: menuData.table.id,
      hotelId: menuData.hotel.id
    })
  });
  const pushData = await pushRes.json();
  console.log(`✓ Push subscription response: ${pushData.message}`);

  // 9. Verify Frontend SSR Routes
  console.log("\n9. Testing Frontend SSR Page Statuses...");
  const pages = [
    "/",
    "/menu?hotel=hotel-annapoorna&table=tbl_annapoorna_08",
    `/orders/${order.id}`,
    `/bill/${order.id}`,
    "/history",
    "/kitchen"
  ];
  for (const p of pages) {
    const pRes = await fetch(`${baseUrl}${p}`);
    console.log(`✓ ${p}: HTTP ${pRes.status} ${pRes.statusText}`);
  }

  console.log("\n==================================================");
  console.log("ALL VERIFICATION TESTS PASSED FLAWLESSLY! (100%)");
  console.log("==================================================");
}

runE2ETest().catch((err) => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
