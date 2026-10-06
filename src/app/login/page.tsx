"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import {
  User,
  Phone,
  ArrowLeft,
  Receipt,
  Clock,
  Utensils,
  LogOut,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Calendar,
} from "lucide-react";

export default function CustomerLoginPage() {
  const {
    customerPhone,
    setCustomerPhone,
    customerName,
    setCustomerName,
    customerLogout,
  } = useCart();

  const [phoneInput, setPhoneInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ALL");

  // Fetch history for the given phone number
  const fetchHistory = async (phone: string) => {
    if (!phone.trim()) return;
    try {
      setFetchingHistory(true);
      const res = await fetch(`/api/history?phone=${encodeURIComponent(phone.trim())}`);
      const data = await res.json();
      if (res.ok) {
        setSessions(data.sessions || []);
        if (data.customer?.name && !customerName) {
          setCustomerName(data.customer.name);
        }
      }
    } catch (err) {
      console.error("Failed to load customer history:", err);
    } finally {
      setFetchingHistory(false);
    }
  };

  // If customer is already logged in, fetch their history automatically
  useEffect(() => {
    if (customerPhone) {
      setPhoneInput(customerPhone);
      setNameInput(customerName || "");
      fetchHistory(customerPhone);
    }
  }, [customerPhone]);

  // Listen to mobile pull-to-refresh
  useEffect(() => {
    const handleRefresh = () => {
      if (customerPhone) {
        fetchHistory(customerPhone);
      }
    };
    window.addEventListener("app:refresh", handleRefresh);
    return () => window.removeEventListener("app:refresh", handleRefresh);
  }, [customerPhone]);

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const digits = phoneInput.replace(/\D/g, "");
    if (digits.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    const normalizedPhone = digits.length === 10 ? `+91${digits}` : `+${digits}`;
    const cleanName = nameInput.trim() || "Guest Diner";

    try {
      setLoading(true);
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizedPhone,
          name: cleanName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed.");
      }

      // Save customer state in context & localStorage
      const finalName = data.customer?.name || cleanName;
      const finalPhone = data.customer?.phone || normalizedPhone;

      setCustomerPhone(finalPhone);
      setCustomerName(finalName);

      // Fetch history immediately
      await fetchHistory(finalPhone);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Customer initials
  const getInitials = (name?: string) => {
    if (!name || name === "Guest Diner") return "D";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Filtered sessions
  const filteredSessions = sessions.filter((s) => {
    const isCompleted = s.isCompleted || s.status === "COMPLETED";
    if (activeFilter === "ACTIVE") return !isCompleted;
    if (activeFilter === "COMPLETED") return isCompleted;
    return true;
  });

  // Calculate quick stats
  const totalVisits = sessions.length;
  const totalSpent = sessions.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const totalDishes = sessions.reduce((acc, s) => acc + (s.totalDishesCount || 0), 0);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 pb-28 space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-black/8 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/menu"
            className="w-10 h-10 rounded-2xl bg-white border border-black/8 hover:bg-black/5 text-[#12372A] flex items-center justify-center transition shadow-2xs"
            aria-label="Back to menu"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight">
              {customerPhone ? "My Account & History" : "Customer Login"}
            </h1>
            <p className="text-xs text-[#6B7280]">
              {customerPhone
                ? "Manage your dining profile, order history, and bills"
                : "Login to view your table orders and download bills"}
            </p>
          </div>
        </div>

        {customerPhone && (
          <button
            onClick={customerLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition"
            title="Log out from this device"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        )}
      </div>

      {/* STATE 1: NOT LOGGED IN — SHOW LOGIN FORM */}
      {!customerPhone ? (
        <div className="max-w-md mx-auto space-y-6 pt-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/8 shadow-md space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-[#12372A]/10 text-[#12372A] flex items-center justify-center mx-auto border border-[#12372A]/15 shadow-2xs">
                <User className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-[#171717]">Welcome Diner</h2>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Enter your mobile number to view all your dining orders, track live preparations, and access GST bills.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold text-center animate-shake">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Mobile Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#171717] block">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-[#6B7280]">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    value={phoneInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setPhoneInput(val);
                      if (errorMessage) setErrorMessage("");
                    }}
                    className="w-full pl-12 pr-4 py-3 bg-[#FAF9F6] border border-black/10 rounded-2xl text-sm font-semibold text-[#171717] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 focus:border-[#12372A] transition"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#171717] block">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Arun Kumar"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FAF9F6] border border-black/10 rounded-2xl text-sm font-semibold text-[#171717] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 focus:border-[#12372A] transition"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || phoneInput.replace(/\D/g, "").length < 10}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#12372A] hover:bg-[#0e2b21] disabled:bg-[#12372A]/40 text-white text-sm font-black shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Login & View History</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-black/5 flex items-center justify-center gap-2 text-[11px] text-[#6B7280]">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>No password needed · Safe & Instant access</span>
            </div>
          </div>

          {/* Quick Perks */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-white rounded-2xl border border-black/5 shadow-2xs">
              <Receipt className="w-5 h-5 text-[#C9A227] mx-auto mb-1" />
              <p className="text-[10px] font-bold text-[#171717]">Digital Bills</p>
              <p className="text-[9px] text-[#6B7280]">Download GST receipts</p>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-black/5 shadow-2xs">
              <Clock className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-[#171717]">Live Status</p>
              <p className="text-[9px] text-[#6B7280]">Real-time tracking</p>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-black/5 shadow-2xs">
              <Utensils className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-[#171717]">Quick Reorder</p>
              <p className="text-[9px] text-[#6B7280]">All your favorite meals</p>
            </div>
          </div>
        </div>
      ) : (
        /* STATE 2: LOGGED IN — SHOW PROFILE + ORDER HISTORY */
        <div className="space-y-6">
          {/* Customer Profile Banner Card */}
          <div className="bg-gradient-to-r from-[#12372A] to-[#1d4d3c] text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-[#C9A227] font-black text-xl flex items-center justify-center shadow-inner shrink-0">
                  {getInitials(customerName)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black tracking-tight">
                      {customerName || "Valued Diner"}
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verified</span>
                    </span>
                  </div>
                  <p className="text-xs text-white/80 mt-0.5 font-mono">
                    {customerPhone}
                  </p>
                </div>
              </div>

              {/* Quick Stats Strip */}
              <div className="flex items-center gap-4 sm:gap-6 bg-black/20 backdrop-blur-sm rounded-2xl px-4 py-2.5 border border-white/10 self-start sm:self-auto">
                <div className="text-center">
                  <span className="text-base font-black text-[#C9A227] block">
                    {totalVisits}
                  </span>
                  <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">
                    Visits
                  </span>
                </div>
                <div className="w-px h-7 bg-white/20" />
                <div className="text-center">
                  <span className="text-base font-black text-[#C9A227] block">
                    {totalDishes}
                  </span>
                  <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">
                    Dishes
                  </span>
                </div>
                <div className="w-px h-7 bg-white/20" />
                <div className="text-center">
                  <span className="text-base font-black text-[#C9A227] block">
                    ₹{totalSpent.toFixed(0)}
                  </span>
                  <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">
                    Spent
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* INSIDE LOGIN: ORDER HISTORY SECTION */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#12372A]" />
                <h3 className="text-lg font-black text-[#171717] tracking-tight">
                  Dining History & Bills
                </h3>
                <span className="text-xs font-bold text-[#6B7280] bg-stone-100 px-2 py-0.5 rounded-full">
                  {sessions.length}
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-2xl self-start sm:self-auto">
                <button
                  onClick={() => setActiveFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeFilter === "ALL"
                      ? "bg-[#12372A] text-white shadow-2xs"
                      : "text-[#6B7280] hover:text-[#171717]"
                  }`}
                >
                  All ({sessions.length})
                </button>
                <button
                  onClick={() => setActiveFilter("ACTIVE")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeFilter === "ACTIVE"
                      ? "bg-[#12372A] text-white shadow-2xs"
                      : "text-[#6B7280] hover:text-[#171717]"
                  }`}
                >
                  Active Dining
                </button>
                <button
                  onClick={() => setActiveFilter("COMPLETED")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeFilter === "COMPLETED"
                      ? "bg-[#12372A] text-white shadow-2xs"
                      : "text-[#6B7280] hover:text-[#171717]"
                  }`}
                >
                  Paid & Completed
                </button>
              </div>
            </div>

            {/* List of Sessions / Bills */}
            {fetchingHistory ? (
              <div className="py-16 text-center space-y-2">
                <Loader2 className="w-8 h-8 text-[#12372A] animate-spin mx-auto" />
                <p className="text-xs text-[#6B7280] font-semibold">
                  Loading your dining history...
                </p>
              </div>
            ) : filteredSessions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSessions.map((session) => {
                  const currency = session.hotel?.currency || "₹";
                  const isCompleted = session.isCompleted || session.status === "COMPLETED";
                  const primaryId = session.primaryOrderId || session.id;

                  return (
                    <div
                      key={session.id}
                      className="bg-white rounded-3xl p-5 border border-black/8 shadow-sm space-y-3 flex flex-col justify-between hover:shadow-md hover:border-black/15 transition group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-base text-[#171717]">
                                {session.tableNumber || "Dining Table"}
                              </span>
                              <span className="text-xs font-mono font-bold text-[#6B7280] bg-stone-100 px-2 py-0.5 rounded-md">
                                {session.sessionCode}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                  isCompleted
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-amber-50 text-amber-800 border border-amber-200"
                                }`}
                              >
                                {isCompleted
                                  ? `PAID (${session.paymentMethod || "CASH"})`
                                  : "ACTIVE DINING"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-[#6B7280] mt-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>
                                {new Date(session.createdAt).toLocaleDateString([], {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}{" "}
                                at{" "}
                                {new Date(session.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-base sm:text-lg font-black text-[#12372A] block">
                              {currency}
                              {Number(session.totalAmount || 0).toFixed(2)}
                            </span>
                            <span className="text-[10px] font-semibold text-[#6B7280]">
                              {session.totalDishesCount || 1} dishes · {session.orderCount || 1} {session.orderCount === 1 ? "order" : "orders"}
                            </span>
                          </div>
                        </div>

                        {/* Ordered Items Preview */}
                        <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-black/5 text-xs text-[#6B7280] line-clamp-2 leading-relaxed">
                          {session.items?.map((i: any) => `${i.quantity}x ${i.productName}`).join(" · ") || "Dining dishes"}
                        </div>

                        {session.billNumber && (
                          <div className="text-[11px] font-bold text-[#12372A] flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-[#C9A227]" />
                            <span>Invoice: #{session.billNumber}</span>
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-between pt-3 gap-2.5 border-t border-black/5">
                        {!isCompleted && (
                          <Link
                            href={`/orders/${primaryId}`}
                            className="flex-1 py-2.5 px-3.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-bold text-[#171717] text-center flex items-center justify-center gap-1.5 transition"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Track Order</span>
                          </Link>
                        )}

                        <Link
                          href={`/bill/${primaryId}`}
                          className="flex-1 py-2.5 px-3.5 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] text-xs font-bold text-white text-center flex items-center justify-center gap-1.5 transition shadow-2xs"
                        >
                          <Receipt className="w-3.5 h-3.5 text-[#C9A227]" />
                          <span>View & Download Bill</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 border border-black/8 text-center space-y-3">
                <Utensils className="w-12 h-12 text-stone-300 mx-auto" />
                <h4 className="font-bold text-base text-[#171717]">
                  No orders found for this filter
                </h4>
                <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                  When you scan a table QR and place an order, your dining history and bills will appear right here.
                </p>
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#12372A] text-white text-xs font-bold hover:bg-[#0e2b21] transition shadow-2xs mt-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Browse Menu</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
