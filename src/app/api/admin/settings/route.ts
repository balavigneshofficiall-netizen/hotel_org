import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

    return NextResponse.json({ hotel });
  } catch (err: unknown) {
    console.error("Admin settings get error:", err);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      hotelId,
      name,
      tagline,
      description,
      address,
      phone,
      whatsappNumber,
      whatsappMode,
      whatsappPhoneId,
      whatsappAccessToken,
      whatsappBusinessId,
      notificationSound,
      email,
      taxRate,
      currency,
      primaryColor,
      accentColor,
    } = body;

    if (!hotelId) {
      return NextResponse.json({ error: "hotelId is required" }, { status: 400 });
    }

    const updated = await prisma.hotel.update({
      where: { id: Number(hotelId) },
      data: {
        name,
        tagline,
        description,
        address,
        phone,
        whatsappNumber,
        whatsappMode: whatsappMode || undefined,
        whatsappPhoneId: whatsappPhoneId !== undefined ? whatsappPhoneId : undefined,
        whatsappAccessToken: whatsappAccessToken !== undefined ? whatsappAccessToken : undefined,
        whatsappBusinessId: whatsappBusinessId !== undefined ? whatsappBusinessId : undefined,
        notificationSound: notificationSound || undefined,
        email,
        taxRate: taxRate ? Number(taxRate) : undefined,
        currency,
        primaryColor,
        accentColor,
      },
    });

    return NextResponse.json({ hotel: updated, success: true });
  } catch (err: unknown) {
    console.error("Admin settings patch error:", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
