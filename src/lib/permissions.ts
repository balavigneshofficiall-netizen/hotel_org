export interface PagePermission {
  key: string;
  label: string;
  path: string;
  defaultForStaff: boolean;
}

export const ALL_PAGE_PERMISSIONS: PagePermission[] = [
  { key: "dashboard", label: "Dashboard", path: "/admin/dashboard", defaultForStaff: true },
  { key: "orders_incoming", label: "Orders: New (Incoming)", path: "/admin/orders", defaultForStaff: true },
  { key: "orders_active", label: "Orders: Live Dining", path: "/admin/orders", defaultForStaff: true },
  { key: "orders_completed", label: "Orders: Completed", path: "/admin/orders", defaultForStaff: true },
  { key: "orders_history", label: "Order History Page", path: "/admin/orders/history", defaultForStaff: true },
  { key: "kitchen", label: "Kitchen Display", path: "/kitchen", defaultForStaff: true },
  { key: "tables", label: "Tables & QR", path: "/admin/tables", defaultForStaff: true },
  { key: "menu", label: "Menu Items", path: "/admin/menu", defaultForStaff: false },
  { key: "categories", label: "Categories", path: "/admin/categories", defaultForStaff: false },
  { key: "announcements", label: "Banners & Offers", path: "/admin/announcements", defaultForStaff: false },
  { key: "payments", label: "Payments & Bills", path: "/admin/payments", defaultForStaff: false },
  { key: "reports", label: "Reports", path: "/admin/reports", defaultForStaff: false },
  { key: "customers", label: "Customers", path: "/admin/customers", defaultForStaff: false },
  { key: "feedback", label: "Customer Feedback", path: "/admin/feedback", defaultForStaff: true },
  { key: "staff", label: "Staff & Roles", path: "/admin/staff", defaultForStaff: false },
  { key: "notifications", label: "Notifications", path: "/admin/notifications", defaultForStaff: false },
  { key: "online_orders", label: "Delivery Orders (Swiggy/Zomato)", path: "/admin/online-orders", defaultForStaff: true },
  { key: "integrations", label: "Swiggy & Zomato", path: "/admin/integrations", defaultForStaff: false },
  { key: "settings", label: "Settings", path: "/admin/settings", defaultForStaff: false },
];

export const ALL_PERMISSION_KEYS = ALL_PAGE_PERMISSIONS.map((p) => p.key);

export const DEFAULT_STAFF_PERMISSIONS = ALL_PAGE_PERMISSIONS.filter(
  (p) => p.defaultForStaff
).map((p) => p.key);

/**
 * Normalizes and parses user permissions.
 * Super Admin always has all permissions.
 * Staff defaults to standard operational permissions if unassigned.
 */
export function parseUserPermissions(
  rawPermissions: string | null | undefined,
  role: string
): string[] {
  if (role === "SUPER_ADMIN") {
    return ALL_PERMISSION_KEYS;
  }

  if (!rawPermissions || !rawPermissions.trim()) {
    if (role === "ADMIN") {
      return ALL_PERMISSION_KEYS;
    }
    return DEFAULT_STAFF_PERMISSIONS;
  }

  try {
    const parsed = JSON.parse(rawPermissions);
    if (Array.isArray(parsed)) {
      // Also map legacy 'orders' key to all 3 order tabs
      const result: string[] = [];
      for (const item of parsed) {
        if (item === "orders") {
          if (!result.includes("orders_incoming")) result.push("orders_incoming");
          if (!result.includes("orders_active")) result.push("orders_active");
          if (!result.includes("orders_completed")) result.push("orders_completed");
        } else if (typeof item === "string" && ALL_PERMISSION_KEYS.includes(item)) {
          if (!result.includes(item)) result.push(item);
        }
      }
      return result;
    }
  } catch {
    const split = rawPermissions
      .split(",")
      .map((s) => s.trim())
      .filter((s) => ALL_PERMISSION_KEYS.includes(s) || s === "orders");
    const result: string[] = [];
    for (const item of split) {
      if (item === "orders") {
        if (!result.includes("orders_incoming")) result.push("orders_incoming");
        if (!result.includes("orders_active")) result.push("orders_active");
        if (!result.includes("orders_completed")) result.push("orders_completed");
      } else if (ALL_PERMISSION_KEYS.includes(item)) {
        if (!result.includes(item)) result.push(item);
      }
    }
    if (result.length > 0) return result;
  }

  return role === "ADMIN" ? ALL_PERMISSION_KEYS : DEFAULT_STAFF_PERMISSIONS;
}

/**
 * Finds permission key matching a route pathname.
 */
export function getPermissionKeyForPath(pathname: string): string | null {
  if (pathname === "/admin/login") return null;

  if (pathname === "/admin" || pathname === "/admin/dashboard" || pathname.startsWith("/admin/dashboard/")) {
    return "dashboard";
  }

  if (pathname === "/admin/orders/history" || pathname.startsWith("/admin/orders/history/")) {
    return "orders_history";
  }

  if (pathname === "/admin/orders" || pathname.startsWith("/admin/orders/")) {
    return "orders";
  }

  if (pathname === "/kitchen" || pathname.startsWith("/kitchen/") || pathname === "/admin/kitchen") {
    return "kitchen";
  }

  if (pathname === "/admin/tables" || pathname.startsWith("/admin/tables/")) {
    return "tables";
  }

  if (pathname === "/admin/menu" || pathname.startsWith("/admin/menu/")) {
    return "menu";
  }

  if (pathname === "/admin/categories" || pathname.startsWith("/admin/categories/")) {
    return "categories";
  }

  if (pathname === "/admin/announcements" || pathname.startsWith("/admin/announcements/")) {
    return "announcements";
  }

  if (pathname === "/admin/payments" || pathname.startsWith("/admin/payments/")) {
    return "payments";
  }

  if (pathname === "/admin/reports" || pathname.startsWith("/admin/reports/")) {
    return "reports";
  }

  if (pathname === "/admin/customers" || pathname.startsWith("/admin/customers/")) {
    return "customers";
  }

  if (pathname === "/admin/feedback" || pathname.startsWith("/admin/feedback/")) {
    return "feedback";
  }

  if (pathname === "/admin/staff" || pathname.startsWith("/admin/staff/")) {
    return "staff";
  }

  if (pathname === "/admin/notifications" || pathname.startsWith("/admin/notifications/")) {
    return "notifications";
  }

  if (pathname === "/admin/online-orders" || pathname.startsWith("/admin/online-orders/")) {
    return "online_orders";
  }

  if (pathname === "/admin/integrations" || pathname.startsWith("/admin/integrations/")) {
    return "integrations";
  }

  if (pathname === "/admin/settings" || pathname.startsWith("/admin/settings/")) {
    return "settings";
  }

  return null;
}

/**
 * Checks if user with given permissions can access the given path
 */
export function hasPathPermission(
  allowedPermissions: string[],
  pathname: string,
  role: string
): boolean {
  if (role === "SUPER_ADMIN") return true;

  if (
    pathname === "/admin/orders" ||
    (pathname.startsWith("/admin/orders/") && !pathname.startsWith("/admin/orders/history"))
  ) {
    return (
      allowedPermissions.includes("orders") ||
      allowedPermissions.includes("orders_incoming") ||
      allowedPermissions.includes("orders_active") ||
      allowedPermissions.includes("orders_completed")
    );
  }

  const key = getPermissionKeyForPath(pathname);
  if (!key) return true;

  return allowedPermissions.includes(key);
}
