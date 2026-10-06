import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { parseUserPermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("admin_session");

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const payload = verifySessionToken(sessionCookie.value);

    if (!payload) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Verify user still exists in database
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: Number(payload.adminId) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        hotel: {
          select: { id: true, name: true, slug: true, currency: true },
        },
      },
    });

    if (!adminUser) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const parsedPermissions = parseUserPermissions(
      adminUser.permissions,
      adminUser.role
    );

    return NextResponse.json({
      authenticated: true,
      user: {
        ...adminUser,
        permissions: parsedPermissions,
      },
    });
  } catch (err: unknown) {
    console.error("Auth me check error:", err);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
