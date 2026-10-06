async function runAdminTest() {
  const baseUrl = "http://localhost:3000";
  console.log("=== STARTING ADMIN SUITE VERIFICATION ===");

  // 1. Stats API
  console.log("\n1. Testing GET /api/admin/stats...");
  const statsRes = await fetch(`${baseUrl}/api/admin/stats?hotel=hotel-annapoorna`);
  if (!statsRes.ok) throw new Error(`Stats API failed: ${statsRes.status}`);
  const stats = await statsRes.json();
  console.log(`✓ Today Sales: ₹${stats.todaySales}`);
  console.log(`✓ Active Orders: ${stats.activeOrdersCount}`);
  console.log(`✓ Unique Customers: ${stats.uniqueCustomers}`);
  console.log(`✓ Status counts:`, stats.statusCounts);

  // 2. Orders API & Kanban
  console.log("\n2. Testing GET /api/admin/orders...");
  const ordersRes = await fetch(`${baseUrl}/api/admin/orders?hotel=hotel-annapoorna`);
  if (!ordersRes.ok) throw new Error(`Orders API failed: ${ordersRes.status}`);
  const ordersData = await ordersRes.json();
  console.log(`✓ Total orders in pipeline: ${ordersData.orders.length}`);

  if (ordersData.orders.length > 0) {
    const testOrder = ordersData.orders[0];
    console.log(`✓ Testing status transition on Order #${testOrder.orderNumber}...`);
    const patchRes = await fetch(`${baseUrl}/api/admin/orders`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: testOrder.id,
        status: testOrder.status,
        note: "Admin verified status",
      }),
    });
    if (!patchRes.ok) throw new Error(`Orders PATCH failed: ${patchRes.status}`);
    console.log(`✓ Order status patch verified OK!`);
  }

  // 3. Tables API
  console.log("\n3. Testing GET /api/admin/tables...");
  const tablesRes = await fetch(`${baseUrl}/api/admin/tables?hotel=hotel-annapoorna`);
  if (!tablesRes.ok) throw new Error(`Tables API failed: ${tablesRes.status}`);
  const tablesData = await tablesRes.json();
  console.log(`✓ Active tables count: ${tablesData.tables.length}`);
  console.log(`✓ First table: ${tablesData.tables[0].tableNumber} (QR: ${tablesData.tables[0].qrCodeToken})`);

  // 4. Menu API
  console.log("\n4. Testing GET /api/admin/menu...");
  const menuRes = await fetch(`${baseUrl}/api/admin/menu?hotel=hotel-annapoorna`);
  if (!menuRes.ok) throw new Error(`Menu API failed: ${menuRes.status}`);
  const menuData = await menuRes.json();
  console.log(`✓ Categories: ${menuData.categories.length}`);
  console.log(`✓ Products: ${menuData.products.length}`);

  // 5. Customers API
  console.log("\n5. Testing GET /api/admin/customers...");
  const custRes = await fetch(`${baseUrl}/api/admin/customers?hotel=hotel-annapoorna`);
  if (!custRes.ok) throw new Error(`Customers API failed: ${custRes.status}`);
  const custData = await custRes.json();
  console.log(`✓ Customers directory count: ${custData.totalCount}`);

  // 6. Bills API
  console.log("\n6. Testing GET /api/admin/bills...");
  const billsRes = await fetch(`${baseUrl}/api/admin/bills?hotel=hotel-annapoorna`);
  if (!billsRes.ok) throw new Error(`Bills API failed: ${billsRes.status}`);
  const billsData = await billsRes.json();
  console.log(`✓ Bills count: ${billsData.bills.length}`);

  // 7. Reports API
  console.log("\n7. Testing GET /api/admin/reports...");
  const reportsRes = await fetch(`${baseUrl}/api/admin/reports?hotel=hotel-annapoorna`);
  if (!reportsRes.ok) throw new Error(`Reports API failed: ${reportsRes.status}`);
  const reportsData = await reportsRes.json();
  console.log(`✓ Daily sales points: ${reportsData.dailySales.length}`);
  console.log(`✓ Popular foods tracked: ${reportsData.popularFoods.length}`);

  // 8. Settings API
  console.log("\n8. Testing GET /api/admin/settings...");
  const settingsRes = await fetch(`${baseUrl}/api/admin/settings?hotel=hotel-annapoorna`);
  if (!settingsRes.ok) throw new Error(`Settings API failed: ${settingsRes.status}`);
  const settingsData = await settingsRes.json();
  console.log(`✓ Hotel Name: ${settingsData.hotel.name}`);
  console.log(`✓ Currency: ${settingsData.hotel.currency}, Tax: ${settingsData.hotel.taxRate}%`);

  // 9. Admin SSR Pages
  console.log("\n9. Testing Frontend Admin Pages...");
  const pages = [
    "/admin",
    "/admin/dashboard",
    "/admin/orders",
    "/admin/kitchen",
    "/admin/tables",
    "/admin/menu",
    "/admin/orders/history",
    "/admin/bills",
    "/admin/customers",
    "/admin/reports",
    "/admin/payments",
    "/admin/notifications",
    "/admin/settings",
  ];

  for (const page of pages) {
    const res = await fetch(`${baseUrl}${page}`);
    if (res.status !== 200 && res.status !== 307 && res.status !== 308) {
      throw new Error(`Page ${page} returned unexpected status: ${res.status}`);
    }
    console.log(`✓ ${page}: HTTP ${res.status} OK`);
  }

  console.log("\n==================================================");
  console.log("ALL ADMIN SUITE TESTS PASSED FLAWLESSLY! (100%)");
  console.log("==================================================");
}

runAdminTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
