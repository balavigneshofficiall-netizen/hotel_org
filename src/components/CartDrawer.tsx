"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { HotelData, TableData } from "@/types";
import {
  X,
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";

interface CartDrawerProps {
  hotel: HotelData | null;
  table: TableData | null;
}

export default function CartDrawer({ hotel, table }: CartDrawerProps) {
  const router = useRouter();
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    totalItems,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    guestCount,
    setActiveOrderNumber,
    setActiveSessionId,
    setActiveOrderId,
  } = useCart();

  const [orderInstructions, setOrderInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isCartOpen) return null;

  const currency = hotel?.currency || "₹";
  const taxRate = hotel?.taxRate || 5.0;
  const taxAmount = Number(((subtotal * taxRate) / 100).toFixed(2));
  const discountAmount = 0;
  const grandTotal = Number((subtotal + taxAmount - discountAmount).toFixed(2));

  const handlePlaceOrder = async () => {
    setErrorMessage("");

    if (items.length === 0) {
      setErrorMessage("Your cart is empty. Please add items to place an order.");
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

    if (!table) {
      setErrorMessage("Table information is missing. Please refresh the menu.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: hotel?.id,
          tableId: table?.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          guestCount: guestCount || 1,
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
        throw new Error(data.error || "Failed to submit your order.");
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
        // ignore if confetti fails
      }

      const orderNum = data.order?.orderNumber || data.order?.id;
      setActiveOrderNumber(orderNum);
      if (data.sessionId) setActiveSessionId(data.sessionId);
      if (data.order?.id) setActiveOrderId(data.order.id);
      clearCart();
      setIsCartOpen(false);

      const targetUrl = `/orders/${orderNum}${data.sessionId ? `?session=${data.sessionId}` : ""}`;
      router.replace(targetUrl);

      setTimeout(() => {
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/orders")) {
          window.location.href = targetUrl;
        }
      }, 300);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error placing order";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsCartOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Drawer Content */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="relative z-10 w-full max-w-md max-h-[94vh] bg-[#FAF9F6] rounded-t-[32px] sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 bg-white border-b border-black/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#12372A]/10 text-[#12372A] flex items-center justify-center font-bold text-xs">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-base text-[#171717]">Your Cart</h2>
                <p className="text-[11px] text-[#6B7280]">
                  {table?.tableNumber || "Table 08"} · {hotel?.name || "Hotel Annapoorna"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-[#6B7280] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 pb-36">
            {/* Error banner */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Itemized Order List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-[#6B7280] font-semibold px-1">
                <span>Selected Items ({totalItems})</span>
                <button
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-700 text-[11px] font-semibold"
                >
                  Clear all
                </button>
              </div>

              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="bg-white rounded-2xl p-3 border border-black/5 shadow-2xs flex items-center justify-between gap-3"
                >
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                    <Image
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          item.product.isVeg ? "bg-emerald-600" : "bg-red-600"
                        }`}
                      />
                      <h4 className="text-xs font-bold text-[#171717] truncate">
                        {item.product.name}
                      </h4>
                    </div>

                    <div className="text-xs font-bold text-[#12372A] mt-0.5">
                      {currency}
                      {item.product.price * item.quantity}
                    </div>

                    {item.specialInstructions && (
                      <p className="text-[10px] text-[#C9A227] italic truncate mt-0.5">
                        &ldquo;{item.specialInstructions}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 bg-[#FAF9F6] border border-black/5 rounded-xl px-1.5 py-1 shrink-0">
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity - 1)
                      }
                      className="w-5 h-5 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-red-600 hover:bg-white transition"
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="w-3 h-3 text-red-500" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                    </button>
                    <span className="text-xs font-bold w-3.5 text-center text-[#171717]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity + 1)
                      }
                      className="w-5 h-5 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#12372A] hover:bg-white transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Special Instructions for Order */}
            <div className="bg-white rounded-2xl p-3.5 border border-black/5 space-y-1.5">
              <label className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#C9A227]" />
                <span>Notes for this order</span>
              </label>
              <input
                type="text"
                value={orderInstructions}
                onChange={(e) => setOrderInstructions(e.target.value)}
                placeholder="e.g. Please bring water glasses, serve starters first"
                className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-black/8 rounded-xl text-[#171717] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-1 focus:ring-[#12372A]"
              />
            </div>

            {/* Customer Details */}
            <div className="bg-white rounded-2xl p-3.5 border border-black/5 space-y-3">
              <h4 className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#12372A]" />
                <span>Your Details</span>
              </h4>

              <div className="grid grid-cols-1 gap-2.5">
                <div>
                  <label className="text-[11px] text-[#6B7280] font-medium block mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF9F6] border border-black/8 rounded-xl text-[#171717] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-[#6B7280] font-medium block mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      maxLength={14}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF9F6] border border-black/8 rounded-xl text-[#171717] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bill Summary Breakdown */}
            <div className="bg-white rounded-2xl p-4 border border-black/5 space-y-2">
              <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wider">
                Bill Summary
              </h4>

              <div className="flex items-center justify-between text-xs text-[#6B7280]">
                <span>Items Subtotal</span>
                <span className="font-semibold text-[#171717]">
                  {currency}
                  {subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-[#6B7280]">
                <span>GST ({taxRate}%)</span>
                <span className="font-semibold text-[#171717]">
                  {currency}
                  {taxAmount.toFixed(2)}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-600">
                  <span>Discount</span>
                  <span className="font-semibold">
                    -{currency}
                    {discountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-black/5 flex items-center justify-between text-sm font-extrabold text-[#12372A]">
                <span>Grand Total</span>
                <span>
                  {currency}
                  {grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Place Order Action */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-black/5 shadow-xl">
            <button
              onClick={handlePlaceOrder}
              disabled={submitting || items.length === 0}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#12372A] hover:bg-[#0e2b21] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99] text-white font-bold text-sm shadow-md flex items-center justify-between transition-all duration-200"
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2 w-full">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Placing your order...</span>
                </div>
              ) : (
                <>
                  <div className="text-left">
                    <div className="text-[10px] text-white/80 font-normal">
                      {totalItems} items · {table?.tableNumber || "Table 08"}
                    </div>
                    <div className="text-sm font-extrabold">
                      {currency}
                      {grandTotal.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white/20 px-3.5 py-1.5 rounded-xl text-xs font-bold">
                    <span>Place Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
