const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Checking current counts in DB...");
  const orderCount = await prisma.order.count();
  const sessionCount = await prisma.session.count();
  const billCount = await prisma.bill.count();
  const paymentCount = await prisma.payment.count();
  const itemCount = await prisma.orderItem.count();
  const historyCount = await prisma.orderStatusHistory.count();
  const notificationCount = await prisma.notification.count();

  console.log({
    orderCount,
    sessionCount,
    billCount,
    paymentCount,
    itemCount,
    historyCount,
    notificationCount,
  });

  console.log("\nDeleting all orders, items, bills, payments, notifications, and sessions...");
  await prisma.payment.deleteMany({});
  await prisma.bill.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.orderStatusHistory.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.session.deleteMany({});

  // Reset table statuses to AVAILABLE
  await prisma.hotelTable.updateMany({
    data: { status: "AVAILABLE" },
  });

  console.log("✅ Successfully cleared all orders and sessions! Database is completely fresh.");
}

main()
  .catch((e) => console.error("Error wiping orders:", e))
  .finally(async () => await prisma.$disconnect());
