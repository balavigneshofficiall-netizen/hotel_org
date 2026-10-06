import { PrismaClient, TableStatus, OrderStatus, PaymentStatus, PaymentMethod } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Hotel Annapoorna QR Ordering System...");

  // Clean existing data
  await prisma.payment.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.hotelTable.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.hotel.deleteMany();

  // 1. Create Hotel Annapoorna
  const hotel = await prisma.hotel.create({
    data: {
      name: "Hotel Annapoorna",
      slug: "hotel-annapoorna",
      tagline: "Heritage Flavours & Royal Hospitality",
      description:
        "Serving authentic South Indian delicacies, signature Dum Biriyanis, and rich Mughlai curries since 1984. Prepared with slow-cooked heirloom spices and fresh farm ingredients.",
      address: "74 Heritage Boulevard, Near Clock Tower, Coimbatore, Tamil Nadu",
      phone: "+91 94433 12345",
      whatsappNumber: "+91 94433 12345",
      email: "dine@hotelannapoorna.com",
      logoUrl:
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80",
      coverImage:
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
      currency: "₹",
      taxRate: 5.0,
      primaryColor: "#12372A",
      accentColor: "#C9A227",
    },
  });

  console.log(`Created hotel: ${hotel.name} (${hotel.id})`);

  // 1.5 Create Role-Based Users (Super Admin, Admin, Staff)
  const hashPass = (pw: string) => {
    const salt = crypto.randomBytes(16).toString("hex");
    return `${salt}:${crypto.scryptSync(pw, salt, 64).toString("hex")}`;
  };

  const usersToSeed = [
    {
      email: "superadmin@hotelannapoorna.com",
      password: "super123",
      name: "Sundar Rajan",
      role: "SUPER_ADMIN" as const,
    },
    {
      email: "admin@hotelannapoorna.com",
      password: "admin123",
      name: "Vignesh",
      role: "ADMIN" as const,
    },
    {
      email: "staff@hotelannapoorna.com",
      password: "staff123",
      name: "Karthik",
      role: "STAFF" as const,
    },
  ];

  for (const u of usersToSeed) {
    const passwordHash = hashPass(u.password);
    await prisma.adminUser.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        name: u.name,
        role: u.role,
        hotelId: hotel.id,
      },
      create: {
        email: u.email,
        passwordHash,
        name: u.name,
        role: u.role,
        hotelId: hotel.id,
      },
    });
    console.log(`Seeded ${u.role}: ${u.email} / ${u.password}`);
  }

  // 2. Create Tables
  const tablesData = [
    { number: "01", token: "tbl_annapoorna_01", capacity: 2, floor: "Verandah" },
    { number: "02", token: "tbl_annapoorna_02", capacity: 4, floor: "Main Dining" },
    { number: "03", token: "tbl_annapoorna_03", capacity: 4, floor: "Main Dining" },
    { number: "04", token: "tbl_annapoorna_04", capacity: 6, floor: "Courtyard" },
    { number: "08", token: "tbl_annapoorna_08", capacity: 4, floor: "Royal Hall" }, // Key Table 08
    { number: "10", token: "tbl_annapoorna_10", capacity: 8, floor: "Family Lounge" },
    { number: "12", token: "tbl_annapoorna_12", capacity: 2, floor: "Balcony Garden" },
  ];

  const tables: Record<string, number> = {};
  for (const t of tablesData) {
    const table = await prisma.hotelTable.create({
      data: {
        hotelId: hotel.id,
        tableNumber: `Table ${t.number}`,
        qrCodeToken: t.token,
        capacity: t.capacity,
        floor: t.floor,
        status: TableStatus.AVAILABLE,
      },
    });
    tables[t.number] = table.id;
  }
  console.log(`Created ${tablesData.length} dining tables.`);

  // 3. Create Categories
  const categoriesData = [
    {
      name: "Popular & Chef's Pick",
      slug: "popular",
      icon: "Sparkles",
      sortOrder: 1,
      description: "Our most cherished recipes and house specialties",
    },
    {
      name: "Starters & Appetizers",
      slug: "starters",
      icon: "Flame",
      sortOrder: 2,
      description: "Crispy, spiced finger foods and tandoori skewers",
    },
    {
      name: "Signature Biriyani",
      slug: "biriyani",
      icon: "UtensilsCrossed",
      sortOrder: 3,
      description: "Seeraga Samba and Long-grain Basmati dum cooked with tender meats & ghee",
    },
    {
      name: "Curries & Gravies",
      slug: "curries",
      icon: "Soup",
      sortOrder: 4,
      description: "Rich coastal gravies, butter masalas, and Chettinad specialties",
    },
    {
      name: "Breads & Rice",
      slug: "breads",
      icon: "Wheat",
      sortOrder: 5,
      description: "Flaky Malabar parottas, butter naans, and flavoured jeera rice",
    },
    {
      name: "Coolers & Desserts",
      slug: "desserts",
      icon: "IceCream",
      sortOrder: 6,
      description: "Chilled fresh fruit coolers, jigarthanda, and warm gulab jamun",
    },
  ];

  const catMap: Record<string, number> = {};
  for (const c of categoriesData) {
    const cat = await prisma.category.create({
      data: {
        hotelId: hotel.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        description: c.description,
        sortOrder: c.sortOrder,
      },
    });
    catMap[c.slug] = cat.id;
  }

  // 4. Create Products
  const products = [
    // Biriyani
    {
      categoryId: catMap["biriyani"],
      name: "Chicken Dum Biriyani",
      slug: "chicken-dum-biriyani",
      description:
        "Fragrant long-grain aged basmati rice layered with succulent farm chicken, caramelized onions, fresh mint, and 18 royal spices. Served with creamy raita and spiced salan.",
      price: 180,
      originalPrice: 210,
      imageUrl:
        "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80",
      isVeg: false,
      isPopular: true,
      rating: 4.8,
      reviewsCount: 342,
      prepTimeMinutes: 15,
      ingredients: "Aged Basmati, Tender Chicken, Desi Ghee, Saffron, Rose Water, Mint, Caramelized Onions",
    },
    {
      categoryId: catMap["biriyani"],
      name: "Mutton Seeraga Samba Biriyani",
      slug: "mutton-seeraga-samba-biriyani",
      description:
        "Traditional Tamil Nadu style aromatic tiny-grain Seeraga Samba rice simmered with bone-in tender baby goat, hand-pounded spices, and pure cow ghee.",
      price: 290,
      originalPrice: 320,
      imageUrl:
        "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=80",
      isVeg: false,
      isPopular: true,
      rating: 4.9,
      reviewsCount: 418,
      prepTimeMinutes: 18,
      ingredients: "Seeraga Samba Rice, Baby Goat Mutton, Ghee, Green Chillies, Shallots, Mint leaves",
    },
    {
      categoryId: catMap["biriyani"],
      name: "Paneer Tikka Biriyani",
      slug: "paneer-tikka-biriyani",
      description:
        "Tandoori spiced soft cottage cheese cubes folded with aromatic saffron rice, roasted cashews, fried onions, and garden-fresh mint.",
      price: 160,
      originalPrice: 180,
      imageUrl:
        "https://images.unsplash.com/photo-1642821373181-696a54913e93?auto=format&fit=crop&w=800&q=80",
      isVeg: true,
      isPopular: false,
      rating: 4.7,
      reviewsCount: 195,
      prepTimeMinutes: 15,
      ingredients: "Fresh Malai Paneer, Basmati Rice, Bell Peppers, Cashews, Saffron, Garam Masala",
    },

    // Starters
    {
      categoryId: catMap["starters"],
      name: "Annapoorna Chicken 65",
      slug: "annapoorna-chicken-65",
      description:
        "Crispy boneless chicken tossed with fresh curry leaves, crushed garlic, and fiery red chili paste. The legendary South Indian bar snack.",
      price: 160,
      originalPrice: 180,
      imageUrl:
        "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=80",
      isVeg: false,
      isPopular: true,
      rating: 4.9,
      reviewsCount: 520,
      prepTimeMinutes: 12,
      ingredients: "Boneless Chicken, Crisp Curry Leaves, Red Chilli, Ginger-Garlic, Rice Flour, Lemon",
    },
    {
      categoryId: catMap["starters"],
      name: "Crispy Corn & Pepper Fry",
      slug: "crispy-corn-pepper-fry",
      description:
        "Golden sweet corn kernels tossed with cracked black pepper, crunchy spring onions, and chatpata peri-peri seasoning.",
      price: 130,
      originalPrice: 150,
      imageUrl:
        "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=800&q=80",
      isVeg: true,
      isPopular: false,
      rating: 4.6,
      reviewsCount: 112,
      prepTimeMinutes: 10,
      ingredients: "American Sweet Corn, Black Pepper, Spring Onion, Bell Peppers, Lime Zest",
    },
    {
      categoryId: catMap["starters"],
      name: "Guntur Chilli Paneer",
      slug: "guntur-chilli-paneer",
      description:
        "Wok-tossed creamy cottage cheese fingers with Andhra Guntur chillies, capsicum strips, and tangy dark soya glaze.",
      price: 150,
      originalPrice: 170,
      imageUrl:
        "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80",
      isVeg: true,
      isPopular: true,
      rating: 4.7,
      reviewsCount: 230,
      prepTimeMinutes: 12,
      ingredients: "Cottage Cheese, Andhra Guntur Chillies, Garlic, Capsicum, Spring Onion",
    },
    {
      categoryId: catMap["starters"],
      name: "Tandoori Chicken (Half)",
      slug: "tandoori-chicken-half",
      description:
        "Tender bone-in chicken marinated for 12 hours in Greek yogurt, mustard oil, and Kashmiri deghi mirch, roasted in a flaming clay oven.",
      price: 220,
      originalPrice: 250,
      imageUrl:
        "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
      isVeg: false,
      isPopular: true,
      rating: 4.8,
      reviewsCount: 310,
      prepTimeMinutes: 18,
      ingredients: "Spring Chicken, Hung Curd, Mustard Oil, Kasuri Methi, Lemon, Onion Rings",
    },

    // Curries
    {
      categoryId: catMap["curries"],
      name: "Chettinad Pepper Chicken Gravy",
      slug: "chettinad-pepper-chicken-gravy",
      description:
        "Authentic Karaikudi-style spicy gravy crafted with stone-ground black pepper, star anise, roasted coriander, and coconut paste.",
      price: 190,
      originalPrice: 210,
      imageUrl:
        "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=800&q=80",
      isVeg: false,
      isPopular: true,
      rating: 4.8,
      reviewsCount: 280,
      prepTimeMinutes: 15,
      ingredients: "Chicken, Black Peppercorns, Kalpasi, Fennel Seeds, Coconut, Curry Leaves",
    },
    {
      categoryId: catMap["curries"],
      name: "Paneer Butter Masala",
      slug: "paneer-butter-masala",
      description:
        "Velvety, creamy tomato and cashew makhani gravy infused with butter, roasted kasuri methi, and melt-in-mouth cottage cheese cubes.",
      price: 170,
      originalPrice: 190,
      imageUrl:
        "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80",
      isVeg: true,
      isPopular: true,
      rating: 4.9,
      reviewsCount: 460,
      prepTimeMinutes: 14,
      ingredients: "Fresh Paneer, San Marzano Puree, Cashew Paste, Amul Butter, Kasuri Methi, Cream",
    },
    {
      categoryId: catMap["curries"],
      name: "Dal Makhani Grand",
      slug: "dal-makhani-grand",
      description:
        "Black lentils and kidney beans slow-cooked overnight on charcoal embers with fresh cream, heirloom butter, and smoked fenugreek.",
      price: 140,
      originalPrice: 160,
      imageUrl:
        "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
      isVeg: true,
      isPopular: false,
      rating: 4.7,
      reviewsCount: 180,
      prepTimeMinutes: 10,
      ingredients: "Whole Black Urad, Rajma, White Butter, Garlic, Tomato Puree, Fresh Cream",
    },

    // Breads & Rice
    {
      categoryId: catMap["breads"],
      name: "Malabar Coin Parotta (2 pcs)",
      slug: "malabar-coin-parotta",
      description:
        "Layered, flaky, golden-brown griddle breads kneaded with milk and crushed by hand for maximum crispiness.",
      price: 50,
      originalPrice: null,
      imageUrl:
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80",
      isVeg: true,
      isPopular: true,
      rating: 4.9,
      reviewsCount: 610,
      prepTimeMinutes: 8,
      ingredients: "Refined Flour, Ghee, Salt, Milk, Griddle Toasted",
    },
    {
      categoryId: catMap["breads"],
      name: "Butter Garlic Naan",
      slug: "butter-garlic-naan",
      description:
        "Tandoor-baked leavened bread topped with minced garlic cloves, fresh coriander sprigs, and brushed with melted butter.",
      price: 60,
      originalPrice: null,
      imageUrl:
        "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=800&q=80",
      isVeg: true,
      isPopular: true,
      rating: 4.8,
      reviewsCount: 390,
      prepTimeMinutes: 8,
      ingredients: "Fine Flour, Garlic, Butter, Nigella Seeds, Cilantro",
    },
    {
      categoryId: catMap["breads"],
      name: "Jeera Fried Rice",
      slug: "jeera-fried-rice",
      description:
        "Fluffy basmati rice tempered with roasted cumin seeds, bay leaf, cardamom, and fresh green coriander.",
      price: 120,
      originalPrice: 140,
      imageUrl:
        "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80",
      isVeg: true,
      isPopular: false,
      rating: 4.6,
      reviewsCount: 145,
      prepTimeMinutes: 10,
      ingredients: "Basmati Rice, Cumin Seeds, Ghee, Bay Leaf, Coriander",
    },

    // Desserts & Coolers
    {
      categoryId: catMap["desserts"],
      name: "Madurai Special Jigarthanda",
      slug: "madurai-special-jigarthanda",
      description:
        "The cooling royal beverage made with condensed almond gum (badam pisin), nannari syrup, chilled basundi, and a scoop of rich malai ice cream.",
      price: 80,
      originalPrice: 95,
      imageUrl:
        "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80",
      isVeg: true,
      isPopular: true,
      rating: 4.9,
      reviewsCount: 480,
      prepTimeMinutes: 5,
      ingredients: "Badam Pisin, Nannari Root Extract, Evaporated Milk Basundi, Ice Cream",
    },
    {
      categoryId: catMap["desserts"],
      name: "Royal Gulab Jamun (2 pcs)",
      slug: "royal-gulab-jamun",
      description:
        "Warm, melt-in-the-mouth khoya dumplings soaked in saffron, cardamom, and rose water syrup with slivered pistachios.",
      price: 60,
      originalPrice: 75,
      imageUrl:
        "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80",
      isVeg: true,
      isPopular: false,
      rating: 4.7,
      reviewsCount: 220,
      prepTimeMinutes: 5,
      ingredients: "Pure Mawa/Khoya, Saffron Syrup, Green Cardamom, Pistachio flakes",
    },
    {
      categoryId: catMap["desserts"],
      name: "Chilled Mango Lassi",
      slug: "chilled-mango-lassi",
      description:
        "Thick blended Alphonso mango pulp with fresh homemade curd, a hint of cardamom, and crushed pistachios.",
      price: 70,
      originalPrice: 85,
      imageUrl:
        "https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=800&q=80",
      isVeg: true,
      isPopular: true,
      rating: 4.8,
      reviewsCount: 315,
      prepTimeMinutes: 5,
      ingredients: "Alphonso Mango, Thick Yogurt, Cardamom, Cane Sugar, Crushed Nuts",
    },
    {
      categoryId: catMap["desserts"],
      name: "Fresh Lime Mint Soda",
      slug: "fresh-lime-mint-soda",
      description:
        "Sparkling soda with freshly squeezed Key lime juice, crushed garden mint, rock salt, and sugar cane syrup.",
      price: 45,
      originalPrice: null,
      imageUrl:
        "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80",
      isVeg: true,
      isPopular: false,
      rating: 4.6,
      reviewsCount: 160,
      prepTimeMinutes: 4,
      ingredients: "Key Lime, Fresh Mint, Club Soda, Black Salt, Sugar Syrup",
    },
  ];

  for (const p of products) {
    await prisma.product.create({
      data: {
        hotelId: hotel.id,
        ...p,
      },
    });
  }
  console.log(`Created ${products.length} menu items.`);

  // 5. Create a Demo Customer and Past Order for Table 08 (to demo order history and bill)
  const customer = await prisma.customer.create({
    data: {
      name: "Ramesh Kumar",
      phone: "+919876543210",
      email: "ramesh@example.com",
    },
  });

  const table08Id = tables["08"];

  const pastSession = await prisma.session.create({
    data: {
      hotelId: hotel.id,
      tableId: table08Id,
      customerId: customer.id,
      sessionCode: "SES-001",
      isActive: false,
      billRequested: true,
      startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  const pastOrder = await prisma.order.create({
    data: {
      orderNumber: "ORD-001",
      hotelId: hotel.id,
      tableId: table08Id,
      customerId: customer.id,
      sessionId: pastSession.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      status: OrderStatus.COMPLETED,
      subtotal: 390.0,
      taxRate: 5.0,
      taxAmount: 19.5,
      discountAmount: 0.0,
      totalAmount: 409.5,
      specialInstructions: "Less spicy biriyani please",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      items: {
        create: [
          {
            productName: "Chicken Dum Biriyani",
            unitPrice: 180.0,
            quantity: 1,
            subtotal: 180.0,
            specialInstructions: "Less spicy",
            isVeg: false,
            imageUrl:
              "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80",
          },
          {
            productName: "Annapoorna Chicken 65",
            unitPrice: 160.0,
            quantity: 1,
            subtotal: 160.0,
            isVeg: false,
            imageUrl:
              "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=80",
          },
          {
            productName: "Madurai Special Jigarthanda",
            unitPrice: 50.0,
            quantity: 1,
            subtotal: 50.0,
            isVeg: true,
            imageUrl:
              "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80",
          },
        ],
      },
      statusHistory: {
        create: [
          { status: OrderStatus.PENDING, note: "Order placed via Table QR" },
          { status: OrderStatus.ACCEPTED, note: "Kitchen accepted order" },
          { status: OrderStatus.PREPARING, note: "Chef is preparing dishes" },
          { status: OrderStatus.READY, note: "Order plated and ready" },
          { status: OrderStatus.SERVED, note: "Delivered to Table 08" },
          { status: OrderStatus.COMPLETED, note: "Bill settled" },
        ],
      },
    },
  });

  // Create Bill for past order
  const bill = await prisma.bill.create({
    data: {
      orderId: pastOrder.id,
      hotelId: hotel.id,
      billNumber: "BILL-2026-001",
      subtotal: 390.0,
      taxAmount: 19.5,
      discountAmount: 0.0,
      grandTotal: 409.5,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.UPI,
      generatedAt: pastOrder.createdAt,
      paidAt: pastOrder.createdAt,
    },
  });

  await prisma.payment.create({
    data: {
      billId: bill.id,
      amount: 409.5,
      paymentMethod: PaymentMethod.UPI,
      status: PaymentStatus.PAID,
      transactionId: "UPI-TXN-98421045",
      paidAt: pastOrder.createdAt,
    },
  });

  // Seed 4 announcements for ticker marquee
  await prisma.announcement.deleteMany({ where: { hotelId: hotel.id } });
  await prisma.announcement.createMany({
    data: [
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
    ],
  });

  console.log("Seeding complete! Seeded hotel, tables, menu, past order, bill & announcements.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
