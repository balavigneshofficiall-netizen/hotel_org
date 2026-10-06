"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bell,
  Receipt,
  Grid,
  UtensilsCrossed,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  History,
  UserCheck,
  Megaphone,
  Filter,
  Star,
  Store,
  Bike,
  X,
} from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  activeOrdersCount?: number;
  onlineOrdersCount?: number;
  userRole?: string;
  userPermissions?: string[];
  isMobile?: boolean;
  onCloseMobile?: () => void;
  onItemClick?: () => void;
}

export default function AdminSidebar({
  isCollapsed,
  setIsCollapsed,
  activeOrdersCount = 0,
  onlineOrdersCount = 0,
  userRole,
  userPermissions,
  isMobile = false,
  onCloseMobile,
  onItemClick,
}: SidebarProps) {
  const pathname = usePathname();

  const navGroups = [
    {
      title: null,
      items: [
        {
          name: "Dashboard",
          href: "/admin/dashboard",
          permissionKey: "dashboard",
          icon: LayoutDashboard,
          badge: null,
        },
      ],
    },
    {
      title: "ORDERS",
      items: [
        {
          name: "Orders",
          href: "/admin/orders",
          permissionKey: "orders",
          icon: Bell,
          badge: activeOrdersCount > 0 ? activeOrdersCount : null,
          badgeColor: "bg-[#C9A227] text-black font-black",
        },
        {
          name: "Order History",
          href: "/admin/orders/history",
          permissionKey: "orders_history",
          icon: History,
          badge: null,
        },
      ],
    },
    {
      title: "ONLINE CHANNELS",
      items: [
        {
          name: "Delivery Orders",
          href: "/admin/online-orders",
          permissionKey: "online_orders",
          icon: Bike,
          badge: onlineOrdersCount > 0 ? onlineOrdersCount : null,
          badgeColor: "bg-orange-500 text-white font-black",
        },
        {
          name: "Swiggy & Zomato Hub",
          href: "/admin/integrations",
          permissionKey: "integrations",
          icon: Store,
          badge: null,
        },
      ],
    },
    {
      title: "RESTAURANT",
      items: [
        {
          name: "Tables",
          href: "/admin/tables",
          permissionKey: "tables",
          icon: Grid,
          badge: null,
        },
        {
          name: "Menu",
          href: "/admin/menu",
          permissionKey: "menu",
          icon: UtensilsCrossed,
          badge: null,
        },
        {
          name: "Categories",
          href: "/admin/categories",
          permissionKey: "categories",
          icon: Filter,
          badge: null,
        },
        {
          name: "Slideshow Banners",
          href: "/admin/announcements",
          permissionKey: "announcements",
          icon: Megaphone,
          badge: null,
        },
      ],
    },
    {
      title: "CUSTOMERS",
      items: [
        {
          name: "Customers",
          href: "/admin/customers",
          permissionKey: "customers",
          icon: Users,
          badge: null,
        },
        {
          name: "Feedback",
          href: "/admin/feedback",
          permissionKey: "feedback",
          icon: Star,
          badge: null,
        },
      ],
    },
    {
      title: "FINANCE",
      items: [
        {
          name: "Payments & Bills",
          href: "/admin/payments",
          permissionKey: "payments",
          icon: Receipt,
          badge: null,
        },
        {
          name: "Reports",
          href: "/admin/reports",
          permissionKey: "reports",
          icon: BarChart3,
          badge: null,
        },
      ],
    },

    {
      title: "SYSTEM",
      items: [
        {
          name: "Team & Staff",
          href: "/admin/staff",
          permissionKey: "staff",
          icon: UserCheck,
          badge: null,
        },
        {
          name: "Notifications",
          href: "/admin/notifications",
          permissionKey: "notifications",
          icon: Bell,
          badge: null,
        },
        {
          name: "Settings",
          href: "/admin/settings",
          permissionKey: "settings",
          icon: Settings,
          badge: null,
        },
      ],
    },
  ];

  // Filter items based on user's granted permissions
  const visibleNavGroups = navGroups
    .map((group) => {
      const items = group.items.filter((item) => {
        if (!userRole || userRole === "SUPER_ADMIN") return true;
        if (!userPermissions) return true;
        if (item.permissionKey === "orders") {
          return (
            userPermissions.includes("orders") ||
            userPermissions.includes("orders_incoming") ||
            userPermissions.includes("orders_active") ||
            userPermissions.includes("orders_completed")
          );
        }
        return userPermissions.includes(item.permissionKey);
      });
      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={
        isMobile
          ? "flex flex-col bg-[#0B131F] text-slate-200 w-full h-full select-none"
          : `hidden md:flex flex-col bg-[#0B131F] text-slate-200 border-r border-slate-800/80 transition-all duration-300 z-30 shrink-0 select-none ${
              isCollapsed ? "w-20" : "w-64"
            }`
      }
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E2B755]/25 via-[#C9A227]/15 to-transparent border border-[#E2B755]/40 text-[#E2B755] flex items-center justify-center shrink-0 shadow-sm">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 21V10a8 8 0 0 1 16 0v11" />
              <path d="M4 21h16" />
              <path d="M9 21v-7a3 3 0 0 1 6 0v7" />
              <path d="M8 9.5v2" />
              <path d="M16 9.5v2" />
              <path d="M12 4v2" />
            </svg>
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="min-w-0">
              <h2 className="font-bold text-sm tracking-tight text-white truncate">
                Hotel Admin
              </h2>
              <p className="text-[9px] text-[#C9A227]/80 font-bold tracking-[0.18em] uppercase truncate">
                Annapoorna Operations
              </p>
            </div>
          )}
        </div>

        {isMobile ? (
          <button
            onClick={onCloseMobile}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-7 h-7 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-white flex items-center justify-center transition"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-3 space-y-5">
        {visibleNavGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {group.title && (!isCollapsed || isMobile) && (
              <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400/70">
                {group.title}
              </div>
            )}

            {group.items.map((item) => {
              const isActive = (() => {
                if (item.href === "/admin/dashboard") {
                  return pathname === "/admin/dashboard" || pathname === "/admin";
                }
                if (item.href === "/admin/orders") {
                  return (
                    pathname === "/admin/orders" ||
                    (pathname.startsWith("/admin/orders/") && !pathname.startsWith("/admin/orders/history"))
                  );
                }
                return pathname === item.href || pathname.startsWith(item.href + "/");
              })();

              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onItemClick}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative ${
                    isActive
                      ? "bg-gradient-to-r from-[#123E30] to-[#0D2E24] text-white shadow-sm border border-emerald-500/30"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                  }`}
                  title={isCollapsed && !isMobile ? item.name : undefined}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? "text-[#E2B755]" : "text-slate-400 group-hover:text-white"
                    }`}
                  />

                  {(!isCollapsed || isMobile) && (
                    <span className="flex-1 truncate">{item.name}</span>
                  )}

                  {item.badge !== null && (!isCollapsed || isMobile) && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        item.badgeColor || "bg-emerald-500 text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Dot badge on collapsed */}
                  {item.badge !== null && isCollapsed && !isMobile && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E2B755]" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer: Hospitality Branding & Customer portal link */}
      <div className="border-t border-slate-800/80 p-3 relative overflow-hidden bg-gradient-to-t from-black/20 to-transparent shrink-0">
        {/* Subtle Luxury Leaves / Floral Watermark */}
        {(!isCollapsed || isMobile) && (
          <div className="px-2 pt-1 pb-3 select-none relative">
            <svg
              className="absolute right-0 -bottom-2 w-24 h-24 text-[#C9A227]/[0.08] pointer-events-none"
              viewBox="0 0 100 100"
              fill="currentColor"
            >
              <path d="M15,90 Q55,55 85,15 Q80,50 55,75 Q35,88 15,90 Z" />
              <path d="M30,85 Q65,60 90,30 Q80,68 50,85 Z" />
            </svg>
            <p className="font-serif italic text-sm text-[#E2B755]/85 tracking-wide leading-tight">
              Great Food
            </p>
            <p className="font-serif italic text-sm text-[#E2B755]/85 tracking-wide leading-tight">
              Happier Stays
            </p>
            <div className="w-10 h-[1.5px] bg-gradient-to-r from-[#E2B755]/50 to-transparent mt-1" />
          </div>
        )}

        <Link
          href="/menu"
          target="_blank"
          onClick={onItemClick}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
        >
          <ExternalLink className="w-4 h-4 text-[#E2B755] shrink-0" />
          {(!isCollapsed || isMobile) && <span className="truncate">Open Customer Menu</span>}
        </Link>
      </div>
    </aside>
  );
}
