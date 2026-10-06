import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const hotel = await prisma.hotel.findFirst({
    where: { slug: "hotel-annapoorna" },
  });

  if (!hotel) {
    console.error("Hotel Annapoorna not found!");
    process.exit(1);
  }

  // Clear existing if any
  await prisma.announcement.deleteMany({
    where: { hotelId: hotel.id },
  });

  const announcementsData = [
    {
      hotelId: hotel.id,
      text: "🎉 Flat 15% OFF on all Signature Dum Biriyanis & Tandoori Starters for orders above ₹499! Valid all week.",
      badge: "HOT OFFER",
      icon: "🎉",
      theme: "gold",
      linkUrl: "/menu",
      sortOrder: 1,
      isActive: true,
    },
    {
      hotelId: hotel.id,
      text: "🔥 Chef's Signature: Authentic Chettinad Mutton Sukka & Kari Dosa slow-cooked with heirloom spices.",
      badge: "CHEF'S PICK",
      icon: "🔥",
      theme: "ruby",
      linkUrl: "/menu",
      sortOrder: 2,
      isActive: true,
    },
    {
      hotelId: hotel.id,
      text: "✨ Freshly brewed Kumbakonam Degree Filter Coffee & Ghee Podi Roast served steaming hot all day!",
      badge: "TODAY SPECIAL",
      icon: "✨",
      theme: "emerald",
      linkUrl: "/menu",
      sortOrder: 3,
      isActive: true,
    },
    {
      hotelId: hotel.id,
      text: "👑 Taste our Royal Elaneer Payasam & Gulkand Kunafa — the ultimate sweet finish to your royal dining experience!",
      badge: "FRESH ARRIVAL",
      icon: "👑",
      theme: "gold",
      linkUrl: "/menu",
      sortOrder: 4,
      isActive: true,
    },
  ];

  console.log(`Inserting 4 announcements for hotel ${hotel.name} (id: ${hotel.id})...`);

  for (const item of announcementsData) {
    const created = await prisma.announcement.create({
      data: item,
    });
    console.log(`Created announcement #${created.id}: [${created.badge}] ${created.text}`);
  }

  console.log("Successfully inserted 4 announcements!");
}

main()
  .catch((e) => {
    console.error("Error creating announcements:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
