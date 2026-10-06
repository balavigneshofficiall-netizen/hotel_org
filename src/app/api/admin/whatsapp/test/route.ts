import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendMetaCloudWhatsAppMessage,
  formatWhatsAppPhone,
} from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testPhone, hotelId, whatsappPhoneId, whatsappAccessToken } = body;

    if (!testPhone) {
      return NextResponse.json(
        { error: "Please enter a test phone number." },
        { status: 400 }
      );
    }

    const hotel = await prisma.hotel.findFirst({
      where: hotelId ? { id: Number(hotelId) } : undefined,
    });

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    const mode = hotel.whatsappMode === "DISABLED" ? "DISABLED" : "PAID";

    if (mode === "DISABLED") {
      return NextResponse.json(
        {
          error:
            "WhatsApp notifications are currently disabled. Please select 'Automated Meta API' mode and configure credentials.",
        },
        { status: 400 }
      );
    }

    const activePhoneId = whatsappPhoneId || hotel.whatsappPhoneId;
    const activeToken = whatsappAccessToken || hotel.whatsappAccessToken;

    if (!activePhoneId || !activeToken) {
      return NextResponse.json(
        {
          error:
            "Meta Phone Number ID and Access Token are required. Please configure and save them first.",
        },
        { status: 400 }
      );
    }

    const testMsg = `🧪 Test Notification from ${hotel.name}!\n\nவணக்கம்! உங்க WhatsApp notification setup வெற்றிகரமாக சோதிக்கப்பட்டது.\n\nTime: ${new Date().toLocaleTimeString()}`;

    const metaRes = await sendMetaCloudWhatsAppMessage(
      activePhoneId,
      activeToken,
      testPhone,
      testMsg
    );

    if (!metaRes.success) {
      return NextResponse.json(
        {
          error:
            metaRes.error ||
            "Meta Cloud API call failed. Verify your Token & Phone ID.",
        },
        { status: 502 }
      );
    }

    try {
      await prisma.notification.create({
        data: {
          title: `🧪 Meta API Test to ${formatWhatsAppPhone(testPhone)}`,
          body: testMsg,
          icon: "zap",
        },
      });
    } catch (logErr) {
      console.error("Failed to log test notification:", logErr);
    }

    return NextResponse.json({
      success: true,
      mode: "PAID",
      message: `Test message sent via Meta Cloud API to ${formatWhatsAppPhone(testPhone)}!`,
    });
  } catch (err: unknown) {
    console.error("Test WhatsApp API error:", err);
    return NextResponse.json(
      { error: "Failed to process test WhatsApp notification" },
      { status: 500 }
    );
  }
}
