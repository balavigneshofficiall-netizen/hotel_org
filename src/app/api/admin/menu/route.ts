import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hotelSlug = searchParams.get("hotel") || "hotel-annapoorna";

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug },
      include: {
        categories: {
          orderBy: { sortOrder: "asc" },
          include: {
            products: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    const allProducts = hotel.categories.flatMap((c) => c.products);

    return NextResponse.json({
      categories: hotel.categories,
      products: allProducts,
      currency: hotel.currency,
    });
  } catch (err: unknown) {
    console.error("Admin menu get error:", err);
    return NextResponse.json({ error: "Failed to load menu" }, { status: 500 });
  }
}

function normalizeImageUrl(url?: string | null): string {
  if (!url || !url.trim()) {
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80";
  }
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    return trimmed;
  }
  return `/uploads/menu/${trimmed}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      hotelSlug = "hotel-annapoorna",
      categoryId,
      name,
      description,
      price,
      originalPrice,
      imageUrl,
      isVeg,
      isPopular = false,
      prepTimeMinutes = 15,
      ingredients,
    } = body;

    const hotel = await prisma.hotel.findUnique({ where: { slug: hotelSlug } });
    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    if (!name || !price || !categoryId) {
      return NextResponse.json(
        { error: "Name, category, and price are required." },
        { status: 400 }
      );
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + `-${Date.now().toString().slice(-4)}`;

    const product = await prisma.product.create({
      data: {
        hotelId: hotel.id,
        categoryId: Number(categoryId),
        name,
        slug,
        description: description || "Freshly prepared dish crafted by our master chefs.",
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : null,
        imageUrl: normalizeImageUrl(imageUrl),
        isVeg: Boolean(isVeg),
        isPopular: Boolean(isPopular),
        isAvailable: true,
        prepTimeMinutes: Number(prepTimeMinutes) || 15,
        ingredients: ingredients || null,
      },
    });

    return NextResponse.json({ product, success: true });
  } catch (err: unknown) {
    console.error("Admin menu post error:", err);
    return NextResponse.json({ error: "Failed to create dish" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isAvailable, price, name, description, imageUrl, isVeg, isPopular, categoryId } = body;

    if (!id && !name) {
      return NextResponse.json({ error: "Product id or name is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (typeof isAvailable === "boolean") updateData.isAvailable = isAvailable;
    if (price !== undefined) updateData.price = Number(price);
    if (name && id) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = normalizeImageUrl(imageUrl);
    if (typeof isVeg === "boolean") updateData.isVeg = isVeg;
    if (typeof isPopular === "boolean") updateData.isPopular = isPopular;
    if (categoryId) updateData.categoryId = Number(categoryId);

    let targetProductId = id ? Number(id) : null;
    if (!targetProductId && name) {
      const found = await prisma.product.findFirst({
        where: { name: String(name).trim() },
        select: { id: true },
      });
      if (found) targetProductId = found.id;
    }

    if (!targetProductId) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const updated = await prisma.product.update({
      where: { id: targetProductId },
      data: updateData,
    });

    // Relay stock availability to Swiggy and Zomato
    if (typeof isAvailable === "boolean") {
      try {
        const { syncAggregatorItemAvailability } = await import("@/lib/urbanpiper");
        await syncAggregatorItemAvailability({
          hotelId: updated.hotelId,
          productName: updated.name,
          isAvailable,
        });
      } catch (stockErr) {
        console.error("Failed to sync stock to aggregators:", stockErr);
      }
    }

    return NextResponse.json({ product: updated, success: true });
  } catch (err: unknown) {
    console.error("Admin menu patch error:", err);
    return NextResponse.json({ error: "Failed to update dish" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Product id is required" }, { status: 400 });
    }

    await prisma.product.delete({ where: { id: Number(id) } });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Admin menu delete error:", err);
    return NextResponse.json({ error: "Failed to delete dish" }, { status: 500 });
  }
}
