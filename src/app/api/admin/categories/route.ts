import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET — List all categories for hotel with product counts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hotelSlug = searchParams.get("hotel") || "hotel-annapoorna";

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    const categories = await prisma.category.findMany({
      where: { hotelId: hotel.id },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json({ categories, hotelId: hotel.id });
  } catch (err: unknown) {
    console.error("Admin categories GET error:", err);
    return NextResponse.json(
      { error: "Failed to load categories" },
      { status: 500 }
    );
  }
}

// POST — Create a new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      hotelSlug = "hotel-annapoorna",
      name,
      description,
      icon,
      sortOrder,
    } = body;

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug },
    });
    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Category name is required." },
        { status: 400 }
      );
    }

    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      `-${Date.now().toString().slice(-4)}`;

    // If no sortOrder given, place at the end
    const maxSort = await prisma.category.aggregate({
      where: { hotelId: hotel.id },
      _max: { sortOrder: true },
    });
    const finalSortOrder =
      sortOrder !== undefined && sortOrder !== null
        ? Number(sortOrder)
        : (maxSort._max.sortOrder || 0) + 1;

    const category = await prisma.category.create({
      data: {
        hotelId: hotel.id,
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        icon: icon?.trim() || null,
        sortOrder: finalSortOrder,
        isActive: true,
      },
    });

    return NextResponse.json({ category, success: true });
  } catch (err: unknown) {
    console.error("Admin categories POST error:", err);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}

// PATCH — Update a category
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, icon, sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Category id is required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined)
      updateData.description = description?.trim() || null;
    if (icon !== undefined) updateData.icon = icon?.trim() || null;
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);
    if (typeof isActive === "boolean") updateData.isActive = isActive;

    // If name changed, also update slug
    if (name) {
      updateData.slug =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") +
        `-${Date.now().toString().slice(-4)}`;
    }

    const updated = await prisma.category.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json({ category: updated, success: true });
  } catch (err: unknown) {
    console.error("Admin categories PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE — Delete a category (block if products exist)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Category id is required" },
        { status: 400 }
      );
    }

    // Check if any products exist under this category
    const productCount = await prisma.product.count({
      where: { categoryId: Number(id) },
    });

    if (productCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${productCount} product(s) still belong to this category. Move or delete them first.`,
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id: Number(id) } });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Admin categories DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
