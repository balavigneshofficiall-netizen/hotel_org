"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { HotelData, TableData } from "@/types";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Receipt,
  User,
  Phone,
  MessageSquare,
  ArrowRight,
  AlertCircle,
  Loader2,
  Utensils,
  ChefHat,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  CheckCircle2,
} from "lucide-react";

function CartPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    totalItems,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    activeOrderNumber,
    setActiveOrderNumber,
    activeSessionId,
    setActiveSessionId,
    setActiveOrderId,
    tableToken: contextTableToken,
    setTableToken,
    hotelSlug: contextHotelSlug,
    setHotelSlug,
    setTableNumber,
    tableNumber,
    guestCount,
    setGuestCount,
  } = useCart();

  const queryHotel = searchParams.get("hotel");
  const queryTable = searchParams.get("table");

  // Determine actual table token: URL search param > CartContext > localStorage > fallback
  // Strictly locked to contextTableToken if an active order is present!
  const tableToken =
    activeOrderNumber && contextTableToken
      ? contextTableToken
      : queryTable ||
        contextTableToken ||
        (typeof window !== "undefined"
          ? localStorage.getItem("annapoorna_table_token")
          : null) ||
        "tbl_annapoorna_08";

  const hotelSlug =
    queryHotel ||
    contextHotelSlug ||
    (typeof window !== "undefined"
      ? localStorage.getItem("annapoorna_hotel_slug")
      : null) ||
    "hotel-annapoorna";

  useEffect(() => {
    if (activeOrderNumber) return; // Do not switch table if user has an active order
    if (queryTable) setTableToken(queryTable);
    if (queryHotel) setHotelSlug(queryHotel);
  }, [queryTable, queryHotel, setTableToken, setHotelSlug, activeOrderNumber]);

  const [hotel, setHotel] = useState<HotelData | null>(null);
  const [table, setTable] = useState<TableData | null>(null);
  const [loadingHotel, setLoadingHotel] = useState(true);

  const [orderInstructions, setOrderInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Fetch hotel and table info
  useEffect(() => {
    async function loadHotelAndTable() {
      try {
        const res = await fetch(
          `/api/menu?hotel=${encodeURIComponent(hotelSlug)}&table=${encodeURIComponent(tableToken)}`
        );
        const data = await res.json();
        if (res.ok) {
          setHotel(data.hotel);
          setTable(data.table);
          if (data.table) {
            setTableNumber(data.table.tableNumber);
            if (data.table.qrCodeToken) {
              setTableToken(data.table.qrCodeToken);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load hotel info:", err);
      } finally {
        setLoadingHotel(false);
      }
    }
    loadHotelAndTable();
  }, [hotelSlug, tableToken, setTableNumber, setTableToken]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const currency = hotel?.currency || "₹";
  const taxRate = hotel?.taxRate || 5.0;
  const taxAmount = Number(((subtotal * taxRate) / 100).toFixed(2));
  const grandTotal = Number((subtotal + taxAmount).toFixed(2));
  const tableLabel = table?.tableNumber || (mounted ? tableNumber || "Your Table" : "Your Table");

  const handlePlaceOrder = async () => {
    setErrorMessage("");

    if (items.length === 0) {
      setErrorMessage("Your cart is empty. Please add items to place an order.");
      return;
    }

    if (loadingHotel || !hotel?.id || !table?.id) {
      setErrorMessage("Loading table details. Please try again in a few seconds.");
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }

    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: hotel.id,
          tableId: table.id,
          tableToken: table.qrCodeToken || tableToken,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          guestCount: guestCount || 1,
          sessionId: activeSessionId || undefined,
          items: items.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            specialInstructions: i.specialInstructions || undefined,
          })),
          specialInstructions: orderInstructions.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error && (data.error.includes("Bill has already been requested") || data.error.includes("session"))) {
          setActiveSessionId(null);
        }
        throw new Error(data.error || "Failed to place your order.");
      }

      // Success celebration!
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#12372A", "#C9A227", "#10B981"],
        });
      } catch {
        // ignore
      }

      const orderNum = data.order?.orderNumber || data.order?.id;
      setActiveOrderNumber(orderNum);
      if (data.sessionId) {
        setActiveSessionId(data.sessionId);
      }
      if (data.order?.id) {
        setActiveOrderId(data.order.id);
      }

      // Immediately activate redirect state so cart never flashes empty
      setIsRedirecting(true);
      clearCart();

      const targetUrl = `/orders/${orderNum}${data.sessionId ? `?session=${data.sessionId}` : ""}`;

      // Use replace for smooth direct jump
      router.replace(targetUrl);

      // Instant solid fallback ensuring user is never stuck
      setTimeout(() => {
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/orders")) {
          window.location.href = targetUrl;
        }
      }, 300);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error placing order";
      setErrorMessage(msg);
      setSubmitting(false);
      setIsRedirecting(false);
    }
  };

  if (isRedirecting) {
    return (
      <div className="w-full min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 border border-black/8 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 animate-in zoom-in-50 duration-300" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-[#171717]">Order Placed!</h2>
            <p className="text-xs text-[#6B7280]">Taking you directly to live order tracking…</p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2 text-[#12372A] text-xs font-bold">
            <Loader2 className="w-4 h-4 animate-spin text-[#12372A]" />
            <span>Redirecting now…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#FAF9F6] pb-24">
      {/* ═══ Sticky Top Header with Glassmorphism ═══ */}
      <div className="sticky top-0 z-30 glass-header border-b border-black/5">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/menu"
                aria-label="Back to menu"
                className="w-9 h-9 rounded-xl bg-white border border-black/8 flex items-center justify-center text-[#12372A] hover:bg-stone-50 shadow-sm transition-all active:scale-95 shrink-0"
              >
                <ArrowLeft className="w-[18px] h-[18px] stroke-[2.5]" />
              </Link>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-[#171717] tracking-tight">
                    Your Cart
                  </h1>
                  {totalItems > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gradient-to-r from-[#12372A] to-[#1b4d3b] text-white text-[10px] font-black shadow-sm">
                      {totalItems}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#6B7280] font-medium flex items-center gap-1 mt-0.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span suppressHydrationWarning className="text-[#12372A] font-bold">
                    {tableLabel}{guestCount > 0 ? ` (${guestCount}👥)` : ""}
                  </span>
                  <span className="text-black/20">·</span>
                  <span className="truncate">{hotel?.name || "Hotel Annapoorna"}</span>
                </p>
              </div>
            </div>

            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="shrink-0 text-[10px] font-bold text-red-500 hover:text-red-600 px-2.5 py-1.5 rounded-xl bg-red-50/80 hover:bg-red-100 border border-red-200/50 transition flex items-center gap-1 active:scale-95 cursor-pointer"
                title="Clear all cart items"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 pt-5">
        {/* ═══ Empty State ═══ */}
        {items.length === 0 ? (
          <div className="py-16 sm:py-24 text-center flex flex-col items-center justify-center">
            {/* Animated empty cart illustration */}
            <div className="relative w-48 h-40 sm:w-56 sm:h-48 flex items-center justify-center mb-6">
              <img
                src="/images/empty-cart.gif"
                alt="Empty Cart Animation"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-2 max-w-xs px-4">
              <h2 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
                Your cart is empty
              </h2>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                Explore our menu and add your favourite dishes to get started.
              </p>
            </div>

            <div className="pt-5">
              <Link
                href="/menu"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#12372A] to-[#1b4d3b] hover:from-[#0e2b21] hover:to-[#174232] text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer"
              >
                <Utensils className="w-4 h-4 text-[#C9A227]" />
                <span>Browse Menu</span>
              </Link>
            </div>
          </div>
        ) : (
          /* ═══ Cart with Items ═══ */
          <div className="space-y-4">
            {/* Error message */}
            {errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 animate-[fadeIn_0.3s_ease-out]">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {/* ─── Items List ─── */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-black/5 bg-gradient-to-r from-[#12372A]/[0.03] to-transparent">
                <h3 className="text-[11px] font-bold text-[#12372A] uppercase tracking-widest flex items-center gap-1.5">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-[#C9A227]" />
                  Your Dishes
                </h3>
              </div>

              <div className="divide-y divide-black/[0.04]">
                {items.map((item, index) => (
                  <div
                    key={item.product.id}
                    className="px-4 py-3.5 flex items-center gap-3 hover:bg-[#FAF9F6]/60 transition-colors"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Product image */}
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-100 shrink-0 ring-1 ring-black/5">
                      <Image
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                      {/* Veg/Non-veg badge */}
                      <div className="absolute bottom-0.5 left-0.5">
                        <span
                          className={`w-3 h-3 rounded-[3px] border-[1.5px] flex items-center justify-center ${
                            item.product.isVeg
                              ? "border-emerald-600 bg-white"
                              : "border-red-600 bg-white"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.product.isVeg ? "bg-emerald-600" : "bg-red-600"
                            }`}
                          />
                        </span>
                      </div>
                    </div>

                    {/* Product details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-bold text-[#171717] truncate leading-tight">
                        {item.product.name}
                      </h4>

                      {item.specialInstructions && (
                        <p className="text-[10px] text-[#C9A227] italic truncate mt-0.5">
                          &ldquo;{item.specialInstructions}&rdquo;
                        </p>
                      )}

                      <div className="text-[13px] font-extrabold text-[#12372A] mt-1">
                        {currency}
                        {(item.product.price * item.quantity).toFixed(0)}
                        {item.quantity > 1 && (
                          <span className="text-[10px] text-[#6B7280] font-normal ml-1">
                            ({currency}{item.product.price} × {item.quantity})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity stepper */}
                    <div className="flex items-center gap-0 bg-[#12372A] rounded-xl overflow-hidden shrink-0 shadow-sm">
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                        className="w-8 h-8 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 transition active:scale-90"
                        aria-label="Decrease quantity"
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        ) : (
                          <Minus className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className="text-xs font-black w-6 text-center text-[#C9A227] select-none">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                        className="w-8 h-8 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 transition active:scale-90"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add more items link */}
              <div className="px-4 py-3 border-t border-black/[0.04] bg-[#FAF9F6]/50">
                <Link
                  href="/menu"
                  className="text-xs font-bold text-[#12372A] hover:text-[#0e2b21] flex items-center gap-1.5 transition group"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C9A227] group-hover:rotate-90 transition-transform" />
                  Add more dishes
                </Link>
              </div>
            </div>

            {/* ─── Kitchen Notes & Your Details Single Row Grid on Laptop View ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ─── Kitchen Notes ─── */}
              <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm flex flex-col">
                <label className="text-[11px] font-bold text-[#171717] flex items-center gap-1.5 mb-2">
                  <ChefHat className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Kitchen Notes</span>
                  <span className="text-[9px] text-[#6B7280] font-normal ml-0.5">
                    Optional
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={orderInstructions}
                  onChange={(e) => setOrderInstructions(e.target.value)}
                  placeholder="e.g. Less spicy, serve starters first, extra napkins…"
                  className="w-full flex-1 min-h-[85px] px-3.5 py-2.5 text-xs bg-[#FAF9F6] border border-black/6 rounded-xl text-[#171717] placeholder:text-[#6B7280]/50 focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 focus:border-[#12372A]/30 transition resize-none"
                />
              </div>

              {/* ─── Customer Details ─── */}
              <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] font-bold text-[#171717] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#12372A]" />
                    <span>Your Details</span>
                  </h4>
                  <span className="text-[10px] font-black text-[#12372A] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {guestCount || 1} {guestCount === 1 ? "Guest" : "Guests"} Seated
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] text-[#6B7280] font-semibold block mb-1">
                      Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]/60" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF9F6] border border-black/6 rounded-xl text-[#171717] placeholder:text-[#6B7280]/50 focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 focus:border-[#12372A]/30 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#6B7280] font-semibold block mb-1">
                      Mobile <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]/60" />
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        maxLength={14}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF9F6] border border-black/6 rounded-xl text-[#171717] placeholder:text-[#6B7280]/50 focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 focus:border-[#12372A]/30 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Bill Summary ─── */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-black/5 bg-gradient-to-r from-[#12372A]/[0.03] to-transparent">
                <h4 className="text-[11px] font-bold text-[#12372A] uppercase tracking-widest flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-[#C9A227]" />
                  Bill Summary
                </h4>
              </div>

              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#6B7280]">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-[#171717]">
                    {currency}{subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#6B7280]">
                  <span>GST ({taxRate}%)</span>
                  <span className="font-semibold text-[#171717]">
                    {currency}{taxAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-dashed border-black/8 bg-[#FAF9F6]/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-[#12372A]">Total</span>
                  <span className="text-lg font-black text-[#12372A]">
                    {currency}{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Error message near button for immediate visibility */}
            {errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 animate-[fadeIn_0.3s_ease-out]">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {/* ═══ Place Order CTA ═══ */}
            <button
              onClick={handlePlaceOrder}
              disabled={submitting || items.length === 0 || loadingHotel}
              className="relative w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#12372A] to-[#1b4d3b] hover:from-[#0e2b21] hover:to-[#174232] disabled:opacity-50 disabled:saturate-50 text-white font-bold shadow-lg shadow-[#12372A]/20 flex items-center justify-between transition-all duration-200 active:scale-[0.98] cursor-pointer overflow-hidden group mt-2"
            >
              {/* Subtle shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {submitting ? (
                <div className="flex items-center justify-center gap-2.5 w-full relative z-10">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Placing your order…</span>
                </div>
              ) : (
                <>
                  <div className="text-left relative z-10">
                    <div className="text-[10px] text-white/60 font-medium">
                      {totalItems} {totalItems === 1 ? "item" : "items"} · {tableLabel}
                      {activeSessionId && " · Adding to session"}
                    </div>
                    <div className="text-base font-black tracking-tight">
                      {currency}{grandTotal.toFixed(2)}
                    </div>
                  </div>

                  <div className="relative z-10 flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-xl text-xs font-bold border border-white/10">
                    <span>{activeSessionId ? "Add to Order" : "Place Order"}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] bg-[#FAF9F6]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#12372A]" />
            <span className="text-xs text-[#6B7280]">Loading cart…</span>
          </div>
        </div>
      }
    >
      <CartPageContent />
    </Suspense>
  );
}
