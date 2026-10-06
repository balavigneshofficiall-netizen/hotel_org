import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
 * DELETE /api/admin/users/[id]
 * Deletes a user with role hierarchy enforcement:
 * - STAFF cannot delete anyone.
 * - ADMIN can only delete STAFF.
 * - SUPER_ADMIN can delete ADMIN and STAFF.
 * - Users cannot delete their own account.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const requester = await getAuthenticatedRequester(request);
    if (!requester) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    if (requester.role === "STAFF") {
      return NextResponse.json(
        { error: "Access denied. Staff members are not permitted to delete accounts." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const numId = Number(id);

    if (!id || isNaN(numId)) {
      return NextResponse.json(
        { error: "Valid User ID is required." },
        { status: 400 }
      );
    }

    if (numId === Number(requester.id)) {
      return NextResponse.json(
        { error: "Action prohibited: You cannot delete your own account." },
        { status: 400 }
      );
    }

    // Find the target user
    const targetUser = await prisma.adminUser.findUnique({
      where: { id: numId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // Admin hierarchy check: Admin can only delete STAFF
    if (requester.role === "ADMIN" && targetUser.role !== "STAFF") {
      return NextResponse.json(
        {
          error:
            "Permission denied: Admins can only remove Staff members. You cannot delete Admin or Super Admin accounts.",
        },
        { status: 403 }
      );
    }

    // Super Admin check: If target is also SUPER_ADMIN, ensure at least one Super Admin remains
    if (targetUser.role === "SUPER_ADMIN") {
      const superAdminCount = await prisma.adminUser.count({
        where: { role: "SUPER_ADMIN" },
      });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last remaining Super Admin account." },
          { status: 400 }
        );
      }
    }

    // Perform deletion
    await prisma.adminUser.delete({
      where: { id: numId },
    });

    return NextResponse.json({
      success: true,
      message: `${targetUser.name} (${targetUser.role}) has been removed.`,
    });
  } catch (err: unknown) {
    console.error("DELETE /api/admin/users/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to delete user." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Updates user name, email, role, and optionally password
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const requester = await getAuthenticatedRequester(request);
    if (!requester) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    if (requester.role === "STAFF") {
      return NextResponse.json(
        { error: "Access denied. Staff members cannot edit accounts." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const numId = Number(id);

    if (!id || isNaN(numId)) {
      return NextResponse.json(
        { error: "Valid User ID is required." },
        { status: 400 }
      );
    }

    const targetUser = await prisma.adminUser.findUnique({
      where: { id: numId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // Admin hierarchy check: Admin can only edit STAFF (or themselves)
    if (requester.role === "ADMIN" && targetUser.role !== "STAFF" && numId !== Number(requester.id)) {
      return NextResponse.json(
        {
          error: "Permission denied: Admins can only edit Staff members.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, role, password, permissions } = body;

    const updateData: {
      name?: string;
      email?: string;
      role?: "SUPER_ADMIN" | "ADMIN" | "STAFF";
      passwordHash?: string;
      plainPassword?: string;
      permissions?: string;
    } = {};

    // Page permissions editing: STRICTLY SUPER_ADMIN ONLY
    if (permissions !== undefined) {
      if (requester.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          {
            error:
              "Permission denied: Only Super Admin is authorized to configure page permissions.",
          },
          { status: 403 }
        );
      }

      if (Array.isArray(permissions)) {
        const { ALL_PERMISSION_KEYS } = await import("@/lib/permissions");
        const validKeys = permissions.filter((k: unknown) =>
          typeof k === "string" && ALL_PERMISSION_KEYS.includes(k)
        );
        updateData.permissions = JSON.stringify(validKeys);
      }
    }

    if (name && typeof name === "string" && name.trim()) {
      updateData.name = name.trim();
    }

    if (email && typeof email === "string" && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      // Check if email already used by someone else
      if (cleanEmail !== targetUser.email) {
        const existing = await prisma.adminUser.findUnique({
          where: { email: cleanEmail },
        });
        if (existing && existing.id !== numId) {
          return NextResponse.json(
            { error: "This email address is already in use by another user." },
            { status: 400 }
          );
        }
        updateData.email = cleanEmail;
      }
    }

    if (role && (role === "SUPER_ADMIN" || role === "ADMIN" || role === "STAFF")) {
      // Admin cannot promote anyone to Admin or Super Admin
      if (requester.role === "ADMIN" && role !== "STAFF") {
        return NextResponse.json(
          { error: "Admins cannot change user roles to Admin or Super Admin." },
          { status: 403 }
        );
      }

      // If demoting a SUPER_ADMIN, ensure at least one other SUPER_ADMIN exists
      if (targetUser.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
        const superAdminCount = await prisma.adminUser.count({
          where: { role: "SUPER_ADMIN" },
        });
        if (superAdminCount <= 1) {
          return NextResponse.json(
            { error: "Cannot change the role of the last remaining Super Admin." },
            { status: 400 }
          );
        }
      }

      updateData.role = role;
    }

    if (password && typeof password === "string" && password.trim()) {
      if (requester.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Permission denied: Only Super Admin can change passwords." },
          { status: 403 }
        );
      }
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters long." },
          { status: 400 }
        );
      }
      const { hashPassword } = await import("@/lib/auth");
      updateData.passwordHash = hashPassword(password);
      updateData.plainPassword = password;
    }

    const updatedUser = await prisma.adminUser.update({
      where: { id: numId },
      data: updateData,
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
            slug: true,
          },
        },
      },
    });

    const { parseUserPermissions } = await import("@/lib/permissions");

    return NextResponse.json({
      success: true,
      message: `${updatedUser.name} updated successfully!`,
      user: {
        ...updatedUser,
        plainPassword: requester.role === "SUPER_ADMIN" ? updatedUser.plainPassword : null,
        permissions: parseUserPermissions(updatedUser.permissions, updatedUser.role),
      },
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/users/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update user." },
      { status: 500 }
    );
  }
}

