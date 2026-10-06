"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HotelData, TableData } from "@/types";
import {
  ShoppingBag,
  Clock,
  Utensils,
  User,
  Lock,
  Sparkles,
} from "lucide-react";
import { useCart } from "@/context/CartContext";

interface RestaurantHeaderProps {
  hotel: HotelData;
  table: TableData | null;
  onOpenCheckin?: () => void;
}

export default function RestaurantHeader({
  hotel,
  table,
  onOpenCheckin,
}: RestaurantHeaderProps) {
  const pathname = usePathname();
  const {
    totalItems,
    subtotal,
    activeOrderNumber,
    customerPhone,
    customerName,
    tableToken,
    tableNumber,
    guestCount,
    hotelSlug,
  } = useCart();

  // If in kitchen dashboard or print mode, hide header completely
  if (pathname?.startsWith("/kitchen")) return null;

  const currentTableToken = table?.qrCodeToken || tableToken;
  const currentHotelSlug = hotel?.slug || hotelSlug;
  const tableLabel = table?.tableNumber || "Your Table";

  const menuHref = currentTableToken
    ? `/menu?hotel=${encodeURIComponent(currentHotelSlug)}&table=${encodeURIComponent(currentTableToken)}`
    : "/menu";

  const cartHref = currentTableToken
    ? `/cart?hotel=${encodeURIComponent(currentHotelSlug)}&table=${encodeURIComponent(currentTableToken)}`
    : "/cart";

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E2D9] transition-all no-print shadow-2xs">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-3">
          {/* Left: Hotel Logo & Hotel Name + Tagline */}
          <Link
            href={menuHref}
            className="flex items-center gap-2.5 sm:gap-3 group min-w-0 focus:outline-none"
          >
            {hotel.logoUrl ? (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white border-2 border-[#C9A227]/40 shadow-xs group-hover:scale-105 transition-transform shrink-0 flex items-center justify-center p-0.5 overflow-hidden">
                <img
                  src={hotel.logoUrl}
                  alt={hotel.name}
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
            ) : (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#12372A] to-[#1E4D3C] text-[#E2B755] flex items-center justify-center font-serif font-black text-lg sm:text-xl shadow-xs border-2 border-[#C9A227]/40 group-hover:scale-105 transition-transform shrink-0">
                {hotel.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-serif font-black text-base sm:text-lg text-[#171717] tracking-tight truncate group-hover:text-[#12372A] transition-colors leading-tight">
                {hotel.name}
              </h1>
              <p className="text-[10px] sm:text-[11px] font-bold text-[#C9A227] tracking-wider uppercase truncate">
                {hotel.tagline || "Authentic Royal Dining"}
              </p>
            </div>
          </Link>

          {/* Center: Desktop Navigation links (Desktop only) */}
          <nav className="hidden md:flex items-center gap-1 bg-[#FAF9F6] border border-[#E5E2D9] rounded-2xl p-1 shadow-2xs">
            <Link
              href="/menu"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition ${
                pathname === "/menu" || pathname === "/"
                  ? "bg-[#12372A] text-white shadow-xs border border-[#C9A227]/30"
                  : "text-stone-600 hover:text-stone-900 hover:bg-white"
              }`}
            >
              <Utensils className="w-3.5 h-3.5 text-[#E2B755]" />
              <span>Menu</span>
            </Link>

            <Link
              href={activeOrderNumber ? `/orders/${activeOrderNumber}` : "/login"}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                pathname?.startsWith("/orders")
                  ? "bg-[#12372A] text-white shadow-xs border border-[#C9A227]/30"
                  : "text-stone-600 hover:text-stone-900 hover:bg-white"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Track Order</span>
              {activeOrderNumber && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </Link>

            <Link
              href="/login"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                pathname === "/login" || pathname === "/history"
                  ? "bg-[#12372A] text-white shadow-xs border border-[#C9A227]/30"
                  : "text-stone-600 hover:text-stone-900 hover:bg-white"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{customerPhone ? (customerName || "Account") : "Login"}</span>
            </Link>
          </nav>

          {/* Right: Table Badge & Desktop Cart */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Table Badge with luxury gradient */}
            <div
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border shadow-xs whitespace-nowrap ${
                activeOrderNumber
                  ? "bg-amber-950 text-amber-200 border-amber-500/50"
                  : "bg-gradient-to-r from-[#0E2B20] via-[#12372A] to-[#0A2118] text-white border-[#C9A227]/40"
              }`}
            >
              {activeOrderNumber ? (
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
              <span className="font-black text-[11px] sm:text-xs tracking-wider uppercase text-[#E2B755]">
                {tableLabel}{guestCount > 0 ? ` · ${guestCount}👥` : ""}
              </span>
            </div>

            {/* Desktop Cart Button */}
            <Link
              href={cartHref}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-[#12372A] to-[#1E4D3C] hover:from-[#0e2b21] hover:to-[#173e30] text-white text-xs font-black shadow-xs border border-[#C9A227]/30 transition active:scale-98 shrink-0"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4 text-[#E2B755]" />
                {totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#C9A227] text-stone-950 text-[10px] font-black flex items-center justify-center shadow-xs">
                    {totalItems}
                  </span>
                )}
              </div>
              <span>
                {totalItems > 0
                  ? `Cart (${hotel.currency}${subtotal.toFixed(0)})`
                  : "Cart"}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
