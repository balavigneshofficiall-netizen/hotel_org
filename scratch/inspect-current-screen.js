const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const session = await prisma.session.findFirst({
    where: { id: "cmucacoi6000c72yomjctlaut" },
    include: { orders: true },
  });
  console.log("SESSION:", JSON.stringify(session, null, 2));

  const order = await prisma.order.findFirst({
    where: { id: "cmucaj4bn001072yobg4of48e" },
    include: { session: true },
  });
  console.log("ORDER:", JSON.stringify(order, null, 2));
}

check().finally(() => prisma.$disconnect());
