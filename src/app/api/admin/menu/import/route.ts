import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface ImportDishItem {
  name: string;
  categoryName: string;
  price: number;
  originalPrice?: number | null;
  isVeg?: boolean;
  isPopular?: boolean;
  isAvailable?: boolean;
  prepTimeMinutes?: number;
  description?: string;
  ingredients?: string;
  imageUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dishes, hotelSlug = "hotel-annapoorna" } = body as {
      dishes: ImportDishItem[];
      hotelSlug?: string;
    };

    if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
      return NextResponse.json(
        { error: "No dishes provided for import." },
        { status: 400 }
      );
    }

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug },
      include: { categories: true },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    // Category cache mapping (lowercase name -> Category ID)
    const categoryMap = new Map<string, number>();
    for (const cat of hotel.categories) {
      categoryMap.set(cat.name.trim().toLowerCase(), cat.id);
    }

    const createdProducts: any[] = [];
    let newCategoriesCreated = 0;

    for (const item of dishes) {
      if (!item.name || !item.name.trim() || !item.price || item.price <= 0) {
        continue; // Skip invalid rows
      }

      const dishName = item.name.trim();
      const rawCategoryName = (item.categoryName || "Main Course").trim();
      const catKey = rawCategoryName.toLowerCase();

      let categoryId = categoryMap.get(catKey);

      // If category doesn't exist, create it automatically!
      if (!categoryId) {
        const catSlug =
          rawCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
          `-${Date.now().toString().slice(-4)}`;
        const newCat = await prisma.category.create({
          data: {
            hotelId: hotel.id,
            name: rawCategoryName,
            slug: catSlug,
            sortOrder: categoryMap.size + 1,
            isActive: true,
          },
        });
        categoryId = newCat.id;
        categoryMap.set(catKey, categoryId);
        newCategoriesCreated++;
      }

      const productSlug =
        dishName.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
        `-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6)}`;

      let finalImageUrl = (item.imageUrl || "").trim();
      if (!finalImageUrl) {
        finalImageUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80";
      } else if (
        !finalImageUrl.startsWith("http://") &&
        !finalImageUrl.startsWith("https://") &&
        !finalImageUrl.startsWith("/")
      ) {
        finalImageUrl = `/uploads/menu/${finalImageUrl}`;
      }

      const product = await prisma.product.create({
        data: {
          hotelId: hotel.id,
          categoryId,
          name: dishName,
          slug: productSlug,
          description:
            (item.description || "").trim() ||
            "Freshly prepared dish crafted by our master chefs.",
          price: Number(item.price),
          originalPrice:
            item.originalPrice && Number(item.originalPrice) > 0
              ? Number(item.originalPrice)
              : null,
          imageUrl: finalImageUrl,
          isVeg: Boolean(item.isVeg),
          isPopular: Boolean(item.isPopular),
          isAvailable: item.isAvailable !== false,
          prepTimeMinutes: Number(item.prepTimeMinutes) || 15,
          ingredients: (item.ingredients || "").trim() || null,
        },
      });

      createdProducts.push(product);
    }

    return NextResponse.json({
      success: true,
      importedCount: createdProducts.length,
      newCategoriesCreated,
      message: `Successfully imported ${createdProducts.length} dishes (${newCategoriesCreated} new categories created)!`,
    });
  } catch (err: unknown) {
    console.error("Menu batch import error:", err);
    return NextResponse.json(
      { error: "Failed to batch import dishes. Please check the Excel data format." },
      { status: 500 }
    );
  }
}
