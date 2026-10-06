import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken, hashPassword } from "@/lib/auth";
import { Role } from "@prisma/client";
import {
  parseUserPermissions,
  DEFAULT_STAFF_PERMISSIONS,
  ALL_PERMISSION_KEYS,
} from "@/lib/permissions";

export const dynamic = "force-dynamic";

// Helper to authenticate requester
async function getAuthenticatedRequester(request: NextRequest) {
  const sessionCookie = request.cookies.get("admin_session");
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const payload = verifySessionToken(sessionCookie.value);
  if (!payload) {
    return null;
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: Number(payload.adminId) },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      hotelId: true,
    },
  });

  return user;
}

/**
 * GET /api/admin/users
 * Returns list of team members with parsed page permissions
 */
export async function GET(request: NextRequest) {
  try {
    const requester = await getAuthenticatedRequester(request);
    if (!requester) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const rawUsers = await prisma.adminUser.findMany({
      where: requester.hotelId ? { hotelId: requester.hotelId } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        plainPassword: true,
        createdAt: true,
        updatedAt: true,
        hotel: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [
        { role: "asc" }, // SUPER_ADMIN first, then ADMIN, then STAFF
        { createdAt: "desc" },
      ],
    });

    const isSuper = requester.role === "SUPER_ADMIN";
    const users = rawUsers.map((u) => ({
      ...u,
      plainPassword: isSuper ? u.plainPassword : null,
      permissions: parseUserPermissions(u.permissions, u.role),
    }));

    return NextResponse.json({
      success: true,
      currentUserRole: requester.role,
      currentUserId: requester.id,
      users,
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json(
      { error: "Failed to fetch team members." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Hierarchical User Creation:
 * - SUPER_ADMIN can create ADMIN and STAFF.
 * - ADMIN can only create STAFF.
 * - STAFF cannot create any users.
 */
export async function POST(request: NextRequest) {
  try {
    const requester = await getAuthenticatedRequester(request);
    if (!requester) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 1. Role-based creation permissions
    if (requester.role === "STAFF") {
      return NextResponse.json(
        { error: "Access denied. Staff members are not permitted to create accounts." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password, role, permissions } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Name, email, password, and role are required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();
    const cleanPassword = String(password);
    const targetRole = String(role).toUpperCase() as Role;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (cleanPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // 2. Strict hierarchical rule check:
    // Admin can ONLY create STAFF.
    if (requester.role === "ADMIN" && targetRole !== "STAFF") {
      return NextResponse.json(
        {
          error:
            "Permission denied: Admins can only create Staff members. Super Admin authorization is required to create Admin or Super Admin accounts.",
        },
        { status: 403 }
      );
    }

    // Check valid role
    if (!Object.values(Role).includes(targetRole)) {
      return NextResponse.json(
        { error: "Invalid role specified." },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await prisma.adminUser.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    // Calculate permissions to store
    let permissionsToSave: string;
    if (requester.role === "SUPER_ADMIN" && Array.isArray(permissions)) {
      const validKeys = permissions.filter((k: unknown) =>
        typeof k === "string" && ALL_PERMISSION_KEYS.includes(k)
      );
      permissionsToSave = JSON.stringify(validKeys);
    } else if (targetRole === "STAFF") {
      permissionsToSave = JSON.stringify(DEFAULT_STAFF_PERMISSIONS);
    } else {
      permissionsToSave = JSON.stringify(ALL_PERMISSION_KEYS);
    }

    // Hash password and save
    const passwordHash = hashPassword(cleanPassword);

    const newUser = await prisma.adminUser.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        plainPassword: cleanPassword,
        role: targetRole,
        permissions: permissionsToSave,
        hotelId: requester.hotelId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        plainPassword: true,
        createdAt: true,
        hotel: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `${targetRole === "STAFF" ? "Staff" : "Admin"} member created successfully.`,
        user: {
          ...newUser,
          plainPassword: requester.role === "SUPER_ADMIN" ? newUser.plainPassword : null,
          permissions: parseUserPermissions(newUser.permissions, newUser.role),
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/admin/users error:", err);
    return NextResponse.json(
      { error: "Internal server error creating user." },
      { status: 500 }
    );
  }
}
