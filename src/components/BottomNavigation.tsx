"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Utensils, ShoppingBag, Clock, User } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function BottomNavigation() {
  const pathname = usePathname();
  const { totalItems, activeOrderNumber, customerPhone, tableToken, hotelSlug } = useCart();

  // If in admin dashboard, kitchen, or print mode, hide bottom navigation
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/kitchen")) return null;

  const menuHref = tableToken
    ? `/menu?hotel=${encodeURIComponent(hotelSlug)}&table=${encodeURIComponent(tableToken)}`
    : "/menu";

  const cartHref = tableToken
    ? `/cart?hotel=${encodeURIComponent(hotelSlug)}&table=${encodeURIComponent(tableToken)}`
    : "/cart";

  const trackHref = activeOrderNumber
    ? `/orders/${activeOrderNumber}`
    : tableToken
    ? `/orders?hotel=${encodeURIComponent(hotelSlug)}&table=${encodeURIComponent(tableToken)}`
    : "/orders";

  const accountHref = customerPhone
    ? (tableToken ? `/history?hotel=${encodeURIComponent(hotelSlug)}&table=${encodeURIComponent(tableToken)}` : "/history")
    : (tableToken ? `/login?hotel=${encodeURIComponent(hotelSlug)}&table=${encodeURIComponent(tableToken)}` : "/login");

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E2D9] shadow-lg py-2 px-6 safe-area-pb no-print">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Menu Tab */}
        <Link
          href={menuHref}
          className={`flex flex-col items-center gap-1 transition-all py-1 px-3 rounded-2xl ${
            pathname === "/menu" || pathname === "/"
              ? "text-[#12372A] font-black"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          <div className="relative">
            <Utensils className="w-5 h-5" />
            {(pathname === "/menu" || pathname === "/") && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#C9A227] rounded-full" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Menu</span>
        </Link>

        {/* Cart Tab */}
        <Link
          href={cartHref}
          className={`relative flex flex-col items-center gap-1 transition-all py-1 px-3 rounded-2xl ${
            pathname === "/cart"
              ? "text-[#12372A] font-black"
              : "text-stone-500 hover:text-stone-800"
          }`}
          aria-label="View your cart"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#C9A227] text-stone-950 text-[10px] font-black flex items-center justify-center animate-in zoom-in-50 shadow-xs">
                {totalItems}
              </span>
            )}
            {pathname === "/cart" && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#C9A227] rounded-full" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Cart</span>
        </Link>

        {/* Live Order Tracking Tab */}
        <Link
          href={trackHref}
          className={`flex flex-col items-center gap-1 transition-all py-1 px-3 rounded-2xl ${
            pathname?.startsWith("/orders")
              ? "text-[#12372A] font-black"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          <div className="relative">
            <Clock className="w-5 h-5" />
            {activeOrderNumber && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
            {pathname?.startsWith("/orders") && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#C9A227] rounded-full" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Track</span>
        </Link>

        {/* User Login & History Corner Tab */}
        <Link
          href={accountHref}
          className={`flex flex-col items-center gap-1 transition-all py-1 px-3 rounded-2xl ${
            pathname === "/login" || pathname === "/history"
              ? "text-[#12372A] font-black"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          <div className="relative">
            <User className="w-5 h-5" />
            {customerPhone && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
            {(pathname === "/login" || pathname === "/history") && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#C9A227] rounded-full" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">
            {customerPhone ? "Account" : "Login"}
          </span>
        </Link>
      </div>
    </nav>
  );
}
