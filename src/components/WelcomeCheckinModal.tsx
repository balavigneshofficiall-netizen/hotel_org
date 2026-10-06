"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Phone,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { TableData, HotelData } from "@/types";
import { useCart } from "@/context/CartContext";

interface WelcomeCheckinModalProps {
  isOpen: boolean;
  onClose?: () => void;
  table: TableData | null;
  hotel: HotelData | null;
  canDismiss?: boolean;
  onSuccess?: () => void;
  onSwitchTable?: () => void;
}

export default function WelcomeCheckinModal({
  isOpen,
  onClose,
  table,
  hotel,
  canDismiss = false,
  onSuccess,
  onSwitchTable,
}: WelcomeCheckinModalProps) {
  const {
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    guestCount,
    setGuestCount,
    setTableToken,
    setTableNumber,
    setActiveOrderNumber,
  } = useCart();

  const [name, setName] = useState(customerName || "");
  const [phone, setPhone] = useState(customerPhone ? customerPhone.replace(/^\+91/, "") : "");
  const [selectedGuests, setSelectedGuests] = useState<number>(guestCount || 1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [orderConflict, setOrderConflict] = useState<{
    orderNumber: string;
    tableNumber: string;
    tableToken: string;
  } | null>(null);

  const capacity = table?.capacity || 4;
  const occupied = table?.occupiedSeats || 0;
  const available = table?.availableSeats !== undefined ? table.availableSeats : Math.max(0, capacity - occupied);

  // Table is LOCKED if status is OCCUPIED / RESERVED or 0 available seats
  const isLocked = Boolean(
    table && (
      table.status === "OCCUPIED" ||
      table.status === "RESERVED" ||
      available <= 0
    )
  );

  // STRICT BACKGROUND SCROLL LOCK: Completely prevent background scroll on body & html
  useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      const handleTouchMove = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-modal-scrollable]")) {
          e.preventDefault();
        }
      };

      document.addEventListener("touchmove", handleTouchMove, { passive: false });

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.touchAction = originalTouchAction;
        document.removeEventListener("touchmove", handleTouchMove);
      };
    }
  }, [isOpen]);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (customerName) setName(customerName);
      if (customerPhone) setPhone(customerPhone.replace(/^\+91/, ""));
      if (guestCount) {
        setSelectedGuests(Math.min(guestCount, Math.max(1, available)));
      } else {
        setSelectedGuests(Math.min(2, Math.max(1, available)));
      }
      setErrorMessage("");
      setOrderConflict(null);
    }
  }, [isOpen, customerName, customerPhone, guestCount, available]);

  if (!isOpen) return null;

  // ═════════════════════════════════════════════════════════════════
  // 🛑 CONFLICT STATE: Mobile number already has an active order on another table!
  // ═════════════════════════════════════════════════════════════════
  if (orderConflict) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overscroll-none touch-none select-none animate-in fade-in duration-200"
        style={{ touchAction: "none" }}
      >
        <div
          data-modal-scrollable
          className="w-full max-w-[390px] bg-white rounded-3xl border border-amber-300 shadow-2xl overflow-hidden my-auto p-6 text-center space-y-4 animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
          style={{ touchAction: "auto" }}
        >
          {/* Active order shield icon */}
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-700 shadow-xs">
            <ShieldAlert className="w-8 h-8 text-amber-600" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
              Active Order in Progress
            </span>
            <h2 className="text-xl font-black text-[#171717]">
              Active Order at {orderConflict.tableNumber}
            </h2>
            <p className="text-xs text-[#6B7280] leading-relaxed max-w-[280px] mx-auto">
              Your mobile number has order <strong>#{orderConflict.orderNumber}</strong> currently in tracking at <strong>{orderConflict.tableNumber}</strong>. You cannot switch tables until your current bill is settled.
            </p>
          </div>

          {/* Action button: Go to active order */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setTableToken(orderConflict.tableToken);
                setTableNumber(orderConflict.tableNumber);
                setActiveOrderNumber(orderConflict.orderNumber);
                if (typeof window !== "undefined") {
                  window.location.href = `/orders/${orderConflict.orderNumber}`;
                }
              }}
              className="w-full py-3.5 rounded-2xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-white text-xs font-black shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Return to {orderConflict.tableNumber} (Track Order)</span>
              <ArrowRight className="w-4 h-4 text-[#C9A227]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // 🔒 LOCKED STATE: When Table is Full or Occupied -> Do NOT allow click view!
  // ═════════════════════════════════════════════════════════════════
  if (isLocked) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overscroll-none touch-none select-none animate-in fade-in duration-200"
        style={{ touchAction: "none" }}
      >
        <div
          data-modal-scrollable
          className="w-full max-w-[390px] bg-white rounded-3xl border border-red-200 shadow-2xl overflow-hidden my-auto p-6 text-center space-y-4 animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
          style={{ touchAction: "auto" }}
        >
          {/* Lock Icon Badge */}
          <div className="w-16 h-16 mx-auto rounded-3xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
              Table Locked · All Seats Full
            </span>
            <h2 className="text-xl font-black text-[#171717]">
              {table?.tableNumber || "This Table"} is Locked
            </h2>
            <p className="text-xs text-[#6B7280] leading-relaxed max-w-[280px] mx-auto">
              This table is currently occupied ({occupied}/{capacity} seats full). New diners cannot view the menu or place orders at this table.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 space-y-2">
            {/* View Menu Button is completely DISABLED / BLOCKED */}
            <button
              type="button"
              disabled
              className="w-full py-3 rounded-2xl bg-stone-100 border border-stone-200 text-stone-400 text-xs font-black flex items-center justify-center gap-2 cursor-not-allowed select-none opacity-60 pointer-events-none"
              title="Table is locked. Viewing menu is disabled."
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Table is Locked — View Disabled</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter your name.");
      return;
    }

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (selectedGuests > available) {
      setErrorMessage(`Only ${available} seat${available > 1 ? "s are" : " is"} free at this table.`);
      return;
    }

    const normalizedPhone = digits.length === 10 ? `+91${digits}` : `+${digits}`;

    try {
      setSubmitting(true);

      // Register or update customer session in DB, passing current table token to check conflict
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizedPhone,
          name: trimmedName,
          tableToken: table?.qrCodeToken,
        }),
      });

      const data = await res.json();

      // Mobile Number conflict check: Active order on another table!
      if (res.status === 409 && data.hasActiveOrderOnDifferentTable) {
        setOrderConflict({
          orderNumber: data.activeOrderNumber,
          tableNumber: data.activeTableNumber,
          tableToken: data.activeTableToken,
        });
        return;
      }

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to proceed. Please try again.");
        return;
      }

      const finalName = data.customer?.name || trimmedName;
      const finalPhone = data.customer?.phone || normalizedPhone;

      // Update CartContext
      setCustomerName(finalName);
      setCustomerPhone(finalPhone);
      setGuestCount(selectedGuests);

      if (table) {
        setTableNumber(table.tableNumber);
        if (table.qrCodeToken) {
          setTableToken(table.qrCodeToken);
          try {
            sessionStorage.setItem(`annapoorna_checkedin_${table.qrCodeToken}`, "true");
            localStorage.setItem("annapoorna_checked_in_table", table.qrCodeToken);
            localStorage.setItem("annapoorna_cust_name", finalName);
            localStorage.setItem("annapoorna_cust_phone", finalPhone);
            localStorage.setItem("annapoorna_guest_count", String(selectedGuests));
          } catch {}
        }
      }

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      console.error("Failed to check-in customer:", err);
      setErrorMessage("Failed to proceed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const maxOptions = Math.min(available > 0 ? available : capacity, 8);
  const guestOptions = Array.from({ length: maxOptions }, (_, i) => i + 1);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overscroll-none touch-none select-none animate-in fade-in duration-200"
      style={{ touchAction: "none" }}
    >
      <div
        data-modal-scrollable
        className="w-full max-w-[390px] bg-white rounded-3xl border border-[#E5E2D9] shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: "auto" }}
      >
        {/* Header: Aesthetic, Clean, Luxury Restaurant Feel */}
        <div className="bg-gradient-to-br from-[#12372A] to-[#0A1F17] px-6 pt-6 pb-5 text-white relative">
          {canDismiss && onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Restaurant Brand Pill */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A227] animate-pulse" />
            <span className="text-[11px] font-black tracking-widest uppercase text-[#C9A227]">
              {hotel?.name || "Hotel Annapoorna"}
            </span>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white">
            {table?.tableNumber || "Welcome"}
          </h2>

          {/* Live Seat Availability Badge */}
          <div className="mt-2.5 flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/90 border border-white/15">
              {table?.floor || "Dining Hall"}
            </span>

            {occupied > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-400/20 text-amber-200 border border-amber-400/30 flex items-center gap-1">
                <Users className="w-3 h-3 text-amber-300" />
                {available} Seats Free (Shared)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                {capacity} Seats Available
              </span>
            )}
          </div>
        </div>

        {/* Clean, Simple & Pretty Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-bold text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="text-[11px] font-bold text-[#171717] block mb-1">
              Your Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
                autoFocus
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs font-bold text-[#171717] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 focus:border-[#12372A] transition"
              />
            </div>
          </div>

          {/* Mobile Number Field */}
          <div>
            <label className="text-[11px] font-bold text-[#171717] block mb-1">
              Mobile Number
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#6B7280] font-bold text-xs">
                <Phone className="w-3.5 h-3.5" />
                <span>+91</span>
                <span className="text-black/15">|</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="98765 43210"
                maxLength={10}
                required
                className="w-full pl-18 pr-3.5 py-2.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs font-bold text-[#171717] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 focus:border-[#12372A] transition"
              />
            </div>
          </div>

          {/* Seat Capacity / Guests */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-[#171717] flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#12372A]" />
                <span>Number of Guests</span>
              </label>
              <span className="text-[11px] font-black text-[#12372A] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {selectedGuests} {selectedGuests === 1 ? "Guest" : "Guests"}
              </span>
            </div>

            {/* Quick Chips */}
            <div className="flex items-center gap-1.5">
              {guestOptions.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSelectedGuests(num)}
                  disabled={num > available}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-black border transition ${
                    selectedGuests === num
                      ? "bg-[#12372A] text-white border-[#12372A] shadow-xs"
                      : num > available
                      ? "bg-stone-100 text-stone-300 border-stone-200 cursor-not-allowed"
                      : "bg-[#FAF9F6] text-[#171717] border-[#E5E2D9] hover:bg-stone-100"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Compact Stepper */}
            <div className="flex items-center justify-between mt-1.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl p-1">
              <button
                type="button"
                onClick={() => setSelectedGuests(Math.max(1, selectedGuests - 1))}
                disabled={selectedGuests <= 1}
                className="w-8 h-7 rounded-lg bg-white border border-[#E5E2D9] text-[#171717] font-black text-xs flex items-center justify-center hover:bg-stone-50 active:scale-95 disabled:opacity-30 transition"
              >
                -
              </button>
              <span className="text-[11px] font-bold text-[#171717]">
                {selectedGuests} {selectedGuests === 1 ? "Person" : "People"} Dining
              </span>
              <button
                type="button"
                onClick={() => setSelectedGuests(Math.min(available, selectedGuests + 1))}
                disabled={selectedGuests >= available}
                className="w-8 h-7 rounded-lg bg-white border border-[#E5E2D9] text-[#171717] font-black text-xs flex items-center justify-center hover:bg-stone-50 active:scale-95 disabled:opacity-30 transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#12372A] to-[#1c503e] hover:brightness-110 active:scale-98 text-white text-xs font-bold shadow-md shadow-[#12372A]/20 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              {submitting ? (
                <span>Entering Menu...</span>
              ) : (
                <>
                  <span>Enter & View Menu</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C9A227]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
