"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Clock,
  ArrowRight,
  Bell,
  CheckCircle2,
  Utensils,
  MoreHorizontal,
  FileText,
  BarChart3,
  Calendar,
} from "lucide-react";
import OrderDetailDrawer from "@/components/admin/OrderDetailDrawer";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [timeFilter, setTimeFilter] = useState<"TODAY" | "ALL_TIME" | "RANGE">("TODAY");

  // Default start date to 30 days ago, end date to today
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      let url = "/api/admin/stats";
      if (timeFilter === "RANGE" && startDate && endDate) {
        url += `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  }, [timeFilter, startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Listen to real-time events to refresh stats without page reload
  useEffect(() => {
    const handleUpdate = () => {
      fetchStats();
    };
    window.addEventListener("admin:orderUpdate", handleUpdate);
    return () => window.removeEventListener("admin:orderUpdate", handleUpdate);
  }, [fetchStats]);

  const currency = stats?.currency || "₹";

  const handleAdvanceStatus = async (orderId: string, nextStatus: any) => {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedOrder(data.order);
        fetchStats();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const todayDateFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Calculate dynamic metrics based on selected filter (Today vs All-Time vs Range)
  // ZERO fake mock fallbacks: always 100% original database values
  const isToday = timeFilter === "TODAY";
  const isAllTime = timeFilter === "ALL_TIME";
  const isRange = timeFilter === "RANGE";

  const displaySales = isToday
    ? Number(stats?.todaySales || 0)
    : isAllTime
    ? Number(stats?.lifetimeSales || 0)
    : Number(stats?.rangeSales ?? stats?.todaySales ?? 0);

  const displayOrders = isToday
    ? Number(stats?.todayOrders || 0)
    : isAllTime
    ? Number(stats?.lifetimeOrders || 0)
    : Number(stats?.rangeOrders ?? stats?.todayOrders ?? 0);

  const displayCustomers = isToday
    ? Number(stats?.uniqueCustomers || 0)
    : isAllTime
    ? Number(stats?.lifetimeCustomers || 0)
    : Number(stats?.rangeUniqueCustomers ?? stats?.uniqueCustomers ?? 0);

  const displayAvgOrder = isToday
    ? Number(stats?.avgOrderValue || 0)
    : isAllTime
    ? Number(stats?.lifetimeAvgOrderValue || 0)
    : Number(stats?.rangeAvgOrderValue ?? stats?.avgOrderValue ?? 0);

  // Safely check sales growth vs yesterday without null errors
  const growthPercent =
    typeof stats?.salesGrowthPercent === "number"
      ? stats.salesGrowthPercent
      : null;
  const hasGrowth = growthPercent !== null;

  // Strictly deduplicate recent orders by ID so no duplicates ever show up
  const uniqueRecentOrders = Array.from(
    new Map((stats?.recentOrders || []).map((o: any) => [o.id, o])).values()
  );

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 pb-1">
        {/* Left: Title, Live DB badge, and Date */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Dashboard
            </h1>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              {todayDateFormatted}
            </p>
          </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Time range toggle: Today vs All Time vs Custom Range */}
          <div className="p-1 bg-[#EFECE5] border border-[#E5E2D9] rounded-xl flex items-center gap-1 shadow-2xs">
            <button
              onClick={() => setTimeFilter("TODAY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                timeFilter === "TODAY"
                  ? "bg-[#0D382B] text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeFilter("ALL_TIME")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                timeFilter === "ALL_TIME"
                  ? "bg-[#0D382B] text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              All Time ({stats?.lifetimeOrders || 0})
            </button>
            <button
              onClick={() => setTimeFilter("RANGE")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                timeFilter === "RANGE"
                  ? "bg-[#0D382B] text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Date Range
            </button>
          </div>

          {/* Start Date & End Date Range Picker Group */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E5E2D9] rounded-xl text-xs font-semibold text-stone-700 shadow-2xs hover:border-emerald-600/40 transition flex-wrap">
            <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Start:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setTimeFilter("RANGE");
                }}
                className="bg-transparent text-xs font-bold text-stone-800 focus:outline-none cursor-pointer"
              />
            </div>
            <span className="text-stone-300 font-bold">→</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">End:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setTimeFilter("RANGE");
                }}
                className="bg-transparent text-xs font-bold text-stone-800 focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Orders Button */}
          <Link
            href="/admin/orders"
            className="px-4 py-2 rounded-xl bg-[#0D382B] hover:bg-[#08291F] active:scale-98 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition"
          >
            <Bell className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
            <span>Orders ({stats?.activeOrdersCount || 0})</span>
          </Link>
        </div>
      </div>

      {/* 4 Elegant KPI Cards with Minimal Icons & Subtle Mini Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Today's Sales */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAE6DF] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex flex-col justify-between h-[155px] relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#E8F8F0] text-[#10B981] flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-stone-500">
                {isToday ? "Today's Sales" : "All-Time Sales"}
              </span>
            </div>
            <div className="w-6 h-6 rounded-full bg-[#E8F8F0] text-[#10B981] text-xs font-bold flex items-center justify-center">
              ₹
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              {currency}
              {displaySales.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[11px] font-medium text-stone-400">
              {hasGrowth && isToday ? (
                <span
                  className={
                    growthPercent! >= 0 ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"
                  }
                >
                  {growthPercent! >= 0 ? "↑ +" : "↓ "}
                  {growthPercent}% vs yesterday
                </span>
              ) : (
                "Original settled revenue"
              )}
            </span>

            {/* Sparkline mini-chart wave */}
            <svg
              className="w-20 h-7 text-[#10B981] stroke-current shrink-0"
              viewBox="0 0 80 28"
              fill="none"
            >
              <path
                d="M 0 22 C 20 24, 30 14, 45 18 C 60 22, 68 8, 80 10"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Today's Orders */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAE6DF] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex flex-col justify-between h-[155px] relative overflow-hidden group hover:border-[#D97706]/40 transition">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FEF7E6] text-[#D97706] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-stone-500">
              {isToday ? "Today's Orders" : "All-Time Orders"}
            </span>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              {displayOrders}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[11px] font-medium text-stone-400">
              {isToday ? "Placed today" : "Total orders in database"}
            </span>

            {/* Sparkline mini-chart wave */}
            <svg
              className="w-20 h-7 text-[#D97706] stroke-current shrink-0"
              viewBox="0 0 80 28"
              fill="none"
            >
              <path
                d="M 0 24 C 20 26, 35 18, 50 20 C 65 22, 70 8, 80 10"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Customers */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAE6DF] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex flex-col justify-between h-[155px] relative overflow-hidden group hover:border-[#3B82F6]/40 transition">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EBF5FF] text-[#3B82F6] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-stone-500">
              {isToday ? "Customers" : "Total Customers"}
            </span>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              {displayCustomers}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[11px] font-medium text-stone-400">
              Unique customers
            </span>

            {/* Sparkline mini-chart wave */}
            <svg
              className="w-20 h-7 text-[#3B82F6] stroke-current shrink-0"
              viewBox="0 0 80 28"
              fill="none"
            >
              <path
                d="M 0 24 C 18 24, 28 14, 42 16 C 56 18, 68 6, 80 12"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 4: Average Order */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAE6DF] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex flex-col justify-between h-[155px] relative overflow-hidden group hover:border-[#8B5CF6]/40 transition">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F3EEFF] text-[#8B5CF6] flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-stone-500">
              Average Order
            </span>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              {currency}
              {Math.round(displayAvgOrder).toLocaleString()}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[11px] font-medium text-stone-400">
              Per ticket average
            </span>

            {/* Sparkline mini-chart wave */}
            <svg
              className="w-20 h-7 text-[#8B5CF6] stroke-current shrink-0"
              viewBox="0 0 80 28"
              fill="none"
            >
              <path
                d="M 0 22 C 20 18, 32 24, 48 18 C 64 12, 72 20, 80 8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Clean, Professional Recent Orders Table */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EAE6DF] shadow-xs overflow-hidden">
        {/* Table Header Row */}
        <div className="p-5 border-b border-[#EAE6DF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF2DE] text-[#B45309] flex items-center justify-center shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0F172A]">
                Recent Orders
              </h3>
              <p className="text-xs text-stone-400">
                Original orders from dining tables · Verified database records
              </p>
            </div>
          </div>

          <Link
            href="/admin/orders"
            className="text-xs font-bold text-[#0D382B] hover:text-emerald-700 flex items-center gap-1 group transition"
          >
            <span>View all orders</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-[#EAE6DF] text-stone-400 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4 font-bold">Order ID</th>
                <th className="py-3 px-4 font-bold">Table</th>
                <th className="py-3 px-4 font-bold">Customer</th>
                <th className="py-3 px-4 font-bold">Items</th>
                <th className="py-3 px-4 font-bold">Amount</th>
                <th className="py-3 px-4 font-bold">Time</th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {uniqueRecentOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShoppingBag className="w-8 h-8 text-stone-300" />
                      <p className="font-bold text-sm text-[#0F172A]">
                        No orders recorded yet
                      </p>
                      <p className="text-xs text-stone-400">
                        Orders placed via customer table QR codes will appear
                        here in real time.
                      </p>
                      <Link
                        href="/menu"
                        target="_blank"
                        className="mt-2 px-3.5 py-2 rounded-xl bg-[#0D382B] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <span>Open Customer Menu to Test Order</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                uniqueRecentOrders.map((order: any) => {
                  const isPending = order.status === "PENDING";
                  const isReady = order.status === "READY";
                  const isCompleted = order.status === "COMPLETED";
                  const isCancelled = order.status === "CANCELLED";

                  return (
                    <tr
                      key={order.id}
                      onClick={async () => {
                        const res = await fetch(`/api/orders/${order.id}`);
                        const d = await res.json();
                        if (d.order) setSelectedOrder(d.order);
                      }}
                      className="hover:bg-[#FAF8F4] cursor-pointer transition"
                    >
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        #{order.orderNumber}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#0D382B]">
                        {order.tableNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {order.customerName}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {order.customerPhone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-stone-500 font-medium">
                        {order.itemsCount}{" "}
                        {order.itemsCount === 1 ? "item" : "items"}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        {currency}
                        {Number(order.totalAmount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-stone-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          <span>
                            {new Date(order.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isPending
                              ? "bg-[#FEF3C7] text-[#D97706]"
                              : isReady
                              ? "bg-[#E0F2FE] text-[#0284C7]"
                              : isCompleted
                              ? "bg-[#E6F4EA] text-[#059669]"
                              : isCancelled
                              ? "bg-[#FEE2E2] text-[#DC2626]"
                              : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              fetch(`/api/orders/${order.id}`)
                                .then((r) => r.json())
                                .then((d) => setSelectedOrder(d.order));
                            }}
                            className="px-3.5 py-1 rounded-lg bg-stone-100 hover:bg-[#0D382B] hover:text-white font-bold text-[11px] text-stone-700 transition"
                          >
                            Details
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              fetch(`/api/orders/${order.id}`)
                                .then((r) => r.json())
                                .then((d) => setSelectedOrder(d.order));
                            }}
                            className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition"
                            title="More options"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over order detail drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onAdvanceStatus={handleAdvanceStatus}
      />
    </div>
  );
}
