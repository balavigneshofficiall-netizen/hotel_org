"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader, { AdminUser } from "@/components/admin/AdminHeader";
import { OrderUpdateEvent } from "@/lib/events";
import { hasPathPermission } from "@/lib/permissions";

import {
  playNotificationTone,
  triggerBrowserWebNotification,
} from "@/lib/audioNotification";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/admin/login";
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(!isLoginPage);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [onlineOrdersCount, setOnlineOrdersCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

  // Check admin session verification against database
  useEffect(() => {
    if (isLoginPage) {
      setIsCheckingAuth(false);
      return;
    }

    let isMounted = true;

    async function checkAdminAuth() {
      try {
        const res = await fetch("/api/admin/auth/me", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            if (isMounted) {
              setAdminUser(data.user);
              setIsCheckingAuth(false);
            }
            return;
          }
        }
      } catch (err) {
        console.error("Admin auth check error:", err);
      }

      if (isMounted) {
        router.replace(`/admin/login?from=${encodeURIComponent(pathname)}`);
      }
    }

    checkAdminAuth();

    return () => {
      isMounted = false;
    };
  }, [isLoginPage, pathname, router]);

  // Connect to SSE for real-time admin notifications
  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource("/api/admin/events");

      eventSource.addEventListener("open", () => {
        setIsLiveConnected(true);
      });

      eventSource.addEventListener("adminUpdate", (e: MessageEvent) => {
        try {
          const update: OrderUpdateEvent = JSON.parse(e.data);
          if (soundEnabled) {
            const savedSound =
              (typeof window !== "undefined" &&
                localStorage.getItem("admin_notification_sound")) ||
              "chime";
            playNotificationTone(savedSound);
          }

          // Native Browser Web Notification banner
          triggerBrowserWebNotification({
            title:
              update.status === "PENDING"
                ? `🛎️ New Order #${update.orderNumber}!`
                : `Order #${update.orderNumber} ${update.status}`,
            body: `${update.tableNumber ? `Table ${update.tableNumber}` : "Table order"} · ${update.note || "New update received"}`,
            url: "/admin/orders",
            tag: `order-${update.orderNumber}`,
          });

          // Trigger a custom browser event so any active admin page can react instantly
          window.dispatchEvent(
            new CustomEvent("admin:orderUpdate", { detail: update })
          );
        } catch (err) {
          console.error("Failed to parse admin SSE update:", err);
        }
      });

      eventSource.onerror = () => {
        setIsLiveConnected(false);
      };
    } catch (err) {
      console.error("SSE connection error:", err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [soundEnabled]);

  // Load initial active orders count & real notifications
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (res.ok) {
        const dineInCount = data.dineInActiveOrdersCount ?? data.activeOrdersCount ?? 0;
        const onlineCount = data.onlineActiveOrdersCount ?? 0;
        setActiveOrdersCount(dineInCount);
        setOnlineOrdersCount(onlineCount);
        if (data.recentNotifications) {
          setRecentNotifications(data.recentNotifications);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Listen to local update events to increment/decrement active count
  useEffect(() => {
    const handleUpdate = () => {
      fetchStats();
    };
    window.addEventListener("admin:orderUpdate", handleUpdate);
    return () => window.removeEventListener("admin:orderUpdate", handleUpdate);
  }, [fetchStats]);

  // If viewing the standalone login page, render children without admin dashboard shell
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Show luxury verifying screen while auth session is being validated with the database
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#0B241B] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E6C65B] via-[#C9A227] to-[#997A15] text-[#0B241B] font-serif font-black text-2xl flex items-center justify-center shadow-2xl mb-5 ring-4 ring-[#C9A227]/20 animate-pulse">
          A
        </div>
        <h2 className="text-white text-lg font-serif font-bold tracking-tight mb-2">
          Hotel Annapoorna
        </h2>
        <div className="flex items-center gap-2.5 text-[#C9A227] font-semibold text-xs tracking-wider uppercase">
          <div className="w-3.5 h-3.5 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
          <span>Verifying Admin Authorization...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#FBF9F5] flex flex-row font-sans">
      {/* Fixed Desktop Sidebar */}
      <AdminSidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        activeOrdersCount={activeOrdersCount}
        onlineOrdersCount={onlineOrdersCount}
        userRole={adminUser?.role}
        userPermissions={adminUser?.permissions}
      />

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 md:hidden backdrop-blur-xs flex animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="w-72 sm:w-80 bg-[#0B131F] h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <AdminSidebar
              isCollapsed={false}
              setIsCollapsed={() => {}}
              activeOrdersCount={activeOrdersCount}
              onlineOrdersCount={onlineOrdersCount}
              userRole={adminUser?.role}
              userPermissions={adminUser?.permissions}
              isMobile={true}
              onCloseMobile={() => setIsMobileMenuOpen(false)}
              onItemClick={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#FBF9F5]">
        {/* Fixed Top Header */}
        <AdminHeader
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          isLiveConnected={isLiveConnected}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          currentUser={adminUser}
          recentNotifications={recentNotifications}
        />

        {/* Dynamic Page Content — Enforces Page Access Permissions */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 lg:p-6 w-full">
          {adminUser &&
          !hasPathPermission(
            adminUser.permissions || [],
            pathname,
            adminUser.role
          ) ? (
            <div className="h-full min-h-[460px] flex items-center justify-center p-6">
              <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-amber-200/80 shadow-lg text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 mx-auto shadow-2xs">
                  <svg
                    className="w-7 h-7 text-amber-700"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>

                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900">
                    Access Restricted
                  </span>
                  <h3 className="text-lg font-black text-[#171717] pt-1">
                    Permission Required
                  </h3>
                  <p className="text-xs text-[#6B7280] leading-relaxed">
                    Your account does not have permission to view this page. Access is controlled by role permissions configured by Super Admin.
                  </p>
                </div>

                <div className="p-3 bg-[#FAF9F6] border border-[#E5E2D9] rounded-2xl text-[11px] text-[#12372A] font-semibold">
                  Contact your Super Admin to request permission for this module.
                </div>

                <button
                  onClick={() => router.push("/admin/orders")}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#12372A] to-[#1a4a38] text-white text-xs font-bold shadow-xs hover:from-[#0e2b21] hover:to-[#12372A] cursor-pointer transition"
                >
                  Return to Active Orders
                </button>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
