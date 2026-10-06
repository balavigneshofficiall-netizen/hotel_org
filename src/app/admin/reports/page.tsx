"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  TrendingUp,
  DollarSign,
  Clock,
  Sparkles,
  CreditCard,
  RefreshCw,
  FileSpreadsheet,
  Award,
  Flame,
  UtensilsCrossed,
  Layers,
  Banknote,
  QrCode,
  Calendar,
  ArrowUpRight,
  Crown,
  Filter,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";

interface DailySale {
  date: string;
  label: string;
  fullDate: string;
  sales: number;
  orders: number;
}

interface PopularFood {
  name: string;
  count: number;
  revenue: number;
  isVeg: boolean;
  category: string;
}

interface HourSlot {
  hour: number;
  label: string;
  name: string;
  count: number;
  sales: number;
}

interface PaymentChannel {
  method: string;
  amount: number;
  count: number;
  percent: number;
  color: string;
}

interface CategorySale {
  name: string;
  revenue: number;
  ordersCount: number;
  percent: number;
}

interface ReportsData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    totalItemsSold: number;
    topSellingItem: PopularFood | null;
    bestSalesDay: { label: string; sales: number; orders: number };
    startDate?: string;
    endDate?: string;
  };
  dailySales: DailySale[];
  popularFoods: PopularFood[];
  hours: HourSlot[];
  paymentMethods: PaymentChannel[];
  categorySales: CategorySale[];
  currency: string;
}

type DatePreset = "TODAY" | "YESTERDAY" | "7DAYS" | "30DAYS" | "CUSTOM";

function getPresetDates(preset: DatePreset): { start: string; end: string } {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);

  if (preset === "TODAY") {
    return { start: toISO(now), end: toISO(now) };
  }
  if (preset === "YESTERDAY") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { start: toISO(y), end: toISO(y) };
  }
  if (preset === "7DAYS") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { start: toISO(d), end: toISO(now) };
  }
  if (preset === "30DAYS") {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    return { start: toISO(d), end: toISO(now) };
  }
  return { start: "", end: "" };
}

export default function ReportsAnalyticsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Manual Date Range & Preset States
  const [preset, setPreset] = useState<DatePreset>("7DAYS");
  const initial7 = getPresetDates("7DAYS");
  const [startDate, setStartDate] = useState(initial7.start);
  const [endDate, setEndDate] = useState(initial7.end);

  // Toggle to prevent 20-30 empty zero-days from collapsing
  const [hideEmptyDays, setHideEmptyDays] = useState(false);

  // Hover states for chart bars and hours
  const [hoveredBar, setHoveredBar] = useState<DailySale | null>(null);
  const [hoveredHour, setHoveredHour] = useState<HourSlot | null>(null);

  const currency = "₹";

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      let url = "/api/admin/reports";
      if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
      } else {
        url += `?days=7`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Handle preset clicks
  const handlePresetSelect = (p: DatePreset) => {
    setPreset(p);
    if (p !== "CUSTOM") {
      const { start, end } = getPresetDates(p);
      setStartDate(start);
      setEndDate(end);
      // Auto enable hide empty days for 30 days to avoid clutter
      if (p === "30DAYS") {
        setHideEmptyDays(true);
      } else {
        setHideEmptyDays(false);
      }
    }
  };

  // Filtered daily sales for chart rendering
  const displayDays = useMemo(() => {
    if (!data?.dailySales) return [];
    if (hideEmptyDays) {
      const active = data.dailySales.filter((d) => d.sales > 0 || d.orders > 0);
      return active.length > 0 ? active : data.dailySales;
    }
    return data.dailySales;
  }, [data?.dailySales, hideEmptyDays]);

  // Calculations for charts
  const maxDailySales = useMemo(() => {
    if (displayDays.length === 0) return 1;
    return Math.max(...displayDays.map((d) => d.sales), 1);
  }, [displayDays]);

  const maxFoodCount = useMemo(() => {
    if (!data?.popularFoods || data.popularFoods.length === 0) return 1;
    return Math.max(...data.popularFoods.map((f) => f.count), 1);
  }, [data]);

  const maxHourCount = useMemo(() => {
    if (!data?.hours || data.hours.length === 0) return 1;
    return Math.max(...data.hours.map((h) => h.count), 1);
  }, [data]);

  // Export full multi-sheet financial excel report
  const handleExportExcel = () => {
    if (!data) return;

    const workbook = XLSX.utils.book_new();

    // 1. Summary Sheet
    const summaryRows = [
      { Metric: "Report Period", Value: `${startDate} to ${endDate}` },
      { Metric: "Total Gross Revenue (₹)", Value: data.summary.totalRevenue },
      { Metric: "Total Orders Completed", Value: data.summary.totalOrders },
      { Metric: "Average Order Value (₹)", Value: data.summary.avgOrderValue },
      { Metric: "Total Items Sold", Value: data.summary.totalItemsSold },
      { Metric: "Best Performing Day", Value: `${data.summary.bestSalesDay.label} (₹${data.summary.bestSalesDay.sales})` },
      { Metric: "Top Item By Volume", Value: `${data.summary.topSellingItem?.name || "-"} (${data.summary.topSellingItem?.count || 0} sold)` },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 30 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, wsSummary, "Summary");

    // 2. Daily Sales Sheet
    const dailyRows = (data.dailySales || []).map((d, i) => ({
      "S.No": i + 1,
      "Date": d.fullDate || d.label,
      "Revenue (₹)": d.sales,
      "Orders Count": d.orders,
      "Avg Per Order (₹)": d.orders > 0 ? Math.round(d.sales / d.orders) : 0,
    }));
    const wsDaily = XLSX.utils.json_to_sheet(dailyRows);
    wsDaily["!cols"] = [{ wch: 6 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, wsDaily, "Daily Sales");

    // 3. Popular Food Items Sheet
    const foodRows = (data.popularFoods || []).map((f, i) => ({
      "Rank": i + 1,
      "Dish Name": f.name,
      "Category": f.category,
      "Type": f.isVeg ? "Veg" : "Non-Veg",
      "Quantity Sold": f.count,
      "Total Revenue (₹)": f.revenue,
    }));
    const wsFood = XLSX.utils.json_to_sheet(foodRows);
    wsFood["!cols"] = [{ wch: 6 }, { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, wsFood, "Popular Items");

    // 4. Payment Methods Sheet
    const paymentRows = (data.paymentMethods || []).map((p, i) => ({
      "S.No": i + 1,
      "Payment Channel": p.method,
      "Amount (₹)": p.amount,
      "Settlements Count": p.count,
      "Percentage Share": `${p.percent}%`,
    }));
    const wsPayment = XLSX.utils.json_to_sheet(paymentRows);
    wsPayment["!cols"] = [{ wch: 6 }, { wch: 24 }, { wch: 16 }, { wch: 18 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(workbook, wsPayment, "Payment Channels");

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Annapoorna_Hotel_Analytics_${startDate}_to_${endDate}_${today}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* ───── Top Header & Manual Date Range Bar ───── */}
      <div className="space-y-4 border-b border-[#E5E2D9] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-[#171717] tracking-tight flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#12372A] to-[#1a4a38] flex items-center justify-center shadow-sm">
                <TrendingUp className="w-4.5 h-4.5 text-[#C9A227]" />
              </div>
              Reports & Business Intelligence
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5 ml-11">
              Real-time revenue performance, item velocity, peak dining hours & settlement breakdowns
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Export to Excel */}
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E2D9] hover:bg-emerald-50 text-xs font-bold text-[#12372A] flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
              title="Download formatted Excel report"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>Export Excel</span>
            </button>

            {/* Refresh */}
            <button
              onClick={fetchReports}
              className="p-2 rounded-xl bg-white border border-[#E5E2D9] hover:bg-stone-50 text-[#6B7280] transition cursor-pointer shadow-2xs"
              title="Refresh analytics data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ───── Interactive Manual Date Filter Row ───── */}
        <div className="bg-white rounded-2xl p-3 border border-[#E5E2D9] shadow-2xs flex flex-wrap items-center justify-between gap-3">
          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-[#6B7280] mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#12372A]" />
              Period:
            </span>

            {([
              { key: "TODAY" as const, label: "Today" },
              { key: "YESTERDAY" as const, label: "Yesterday" },
              { key: "7DAYS" as const, label: "Last 7 Days" },
              { key: "30DAYS" as const, label: "Last 30 Days" },
              { key: "CUSTOM" as const, label: "Custom Range" },
            ]).map((item) => (
              <button
                key={item.key}
                onClick={() => handlePresetSelect(item.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  preset === item.key
                    ? "bg-[#12372A] text-white shadow-xs"
                    : "bg-[#FAF9F6] text-[#6B7280] border border-[#E5E2D9] hover:bg-stone-100 hover:text-[#171717]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Manual Date Input Pickers */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#171717]">
              <span className="text-[11px] text-[#6B7280]">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPreset("CUSTOM");
                }}
                className="bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A] cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-[#171717]">
              <span className="text-[11px] text-[#6B7280]">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPreset("CUSTOM");
                }}
                className="bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A] cursor-pointer"
              />
            </div>

            <button
              onClick={fetchReports}
              className="px-3.5 py-1.5 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-95 text-white text-xs font-bold transition cursor-pointer shadow-xs"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>

      {/* ───── 4 Modern Luxury KPI Summary Cards ───── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Revenue */}
        <div className="bg-white rounded-2xl p-4.5 border border-[#E5E2D9] shadow-2xs hover:shadow-xs transition duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">Gross Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#171717] tracking-tight">
            {currency}{(data?.summary?.totalRevenue || 0).toLocaleString("en-IN")}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6B7280] mt-1">
            <span className="text-emerald-700 font-bold flex items-center">
              <ArrowUpRight className="w-3 h-3" />
              {data?.summary?.totalOrders || 0} orders
            </span>
            <span>in selected dates</span>
          </div>
        </div>

        {/* Card 2: Average Order Value (AOV) */}
        <div className="bg-white rounded-2xl p-4.5 border border-[#E5E2D9] shadow-2xs hover:shadow-xs transition duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">Avg Order Value (AOV)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <Award className="w-3.5 h-3.5 text-[#C9A227]" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#171717] tracking-tight">
            {currency}{(data?.summary?.avgOrderValue || 0).toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] font-semibold text-[#6B7280] mt-1">
            Average ticket spend per table session
          </div>
        </div>

        {/* Card 3: Items Velocity */}
        <div className="bg-white rounded-2xl p-4.5 border border-[#E5E2D9] shadow-2xs hover:shadow-xs transition duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">Items Served</span>
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
              <UtensilsCrossed className="w-3.5 h-3.5 text-violet-700" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#171717] tracking-tight">
            {(data?.summary?.totalItemsSold || 0).toLocaleString()} <span className="text-xs font-bold text-[#6B7280]">dishes</span>
          </div>
          <div className="text-[11px] font-semibold text-[#6B7280] mt-1 truncate">
            Top: <strong className="text-[#12372A]">{data?.summary?.topSellingItem?.name || "Biriyani"}</strong>
          </div>
        </div>

        {/* Card 4: Best Sales Day */}
        <div className="bg-white rounded-2xl p-4.5 border border-[#E5E2D9] shadow-2xs hover:shadow-xs transition duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">Peak Sales Day</span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 text-orange-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#171717] tracking-tight flex items-center gap-1.5">
            {data?.summary?.bestSalesDay?.label || "-"}
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Peak</span>
          </div>
          <div className="text-[11px] font-semibold text-[#6B7280] mt-1">
            {currency}{(data?.summary?.bestSalesDay?.sales || 0).toLocaleString("en-IN")} · {data?.summary?.bestSalesDay?.orders || 0} orders
          </div>
        </div>
      </div>

      {/* ───── Main Analytics Section: 2 Columns ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Interactive Revenue Trend Chart */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#E5E2D9] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#171717] flex items-center gap-2">
                  Daily Revenue & Order Volume
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Sales timeline from {startDate} to {endDate}
                </p>
              </div>

              {/* Toggle to Hide Empty Days and prevent date collapse */}
              <button
                onClick={() => setHideEmptyDays(!hideEmptyDays)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                  hideEmptyDays
                    ? "bg-[#12372A] text-white border-[#12372A]"
                    : "bg-[#FAF9F6] text-[#6B7280] border-[#E5E2D9] hover:bg-stone-100"
                }`}
                title="Toggle to hide zero-order days and prevent overcrowded charts"
              >
                {hideEmptyDays ? <EyeOff className="w-3 h-3 text-[#C9A227]" /> : <Eye className="w-3 h-3" />}
                <span>{hideEmptyDays ? "Order Days Only" : "Show All Days"}</span>
              </button>
            </div>

            {/* Hover details status bar */}
            <div className="h-7 flex items-center mb-2 px-3 py-1 bg-[#FAF9F6] rounded-xl border border-[#E5E2D9]/60">
              {hoveredBar ? (
                <div className="text-[11px] font-bold text-[#12372A] flex items-center gap-2 animate-in fade-in duration-150">
                  <span className="bg-[#12372A] text-white px-2 py-0.5 rounded-md text-[10px]">
                    {hoveredBar.fullDate || hoveredBar.label}
                  </span>
                  <span>{currency}{hoveredBar.sales.toLocaleString("en-IN")}</span>
                  <span className="text-[#6B7280]">· {hoveredBar.orders} orders</span>
                </div>
              ) : (
                <span className="text-[11px] text-[#9CA3AF]">
                  Hover over any date pillar to inspect detailed sales and order volume
                </span>
              )}
            </div>

            {/* ─── Scrollable Bar Visualization (Solid Fixed Track Height) ─── */}
            <div className="pt-3 pb-2 overflow-x-auto">
              <div
                className="flex items-end gap-3 px-2 min-h-[250px]"
                style={{
                  minWidth: displayDays.length > 7 ? `${displayDays.length * 58}px` : "100%",
                }}
              >
                {displayDays.length === 0 ? (
                  <div className="w-full h-44 flex items-center justify-center text-xs text-[#6B7280]">
                    No sales recorded for the selected dates.
                  </div>
                ) : (
                  displayDays.map((d, idx) => {
                    const heightPercent = Math.round((d.sales / maxDailySales) * 100);
                    const isBest = d.sales === maxDailySales && d.sales > 0;
                    const isHovered = hoveredBar?.date === d.date;

                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredBar(d)}
                        onMouseLeave={() => setHoveredBar(null)}
                        className={`flex flex-col items-center gap-1.5 group relative cursor-pointer ${
                          displayDays.length > 10 ? "flex-shrink-0 w-[54px]" : "flex-1 min-w-[46px] max-w-[68px]"
                        }`}
                      >
                        {/* Floating tooltip on hover */}
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[#12372A] text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl pointer-events-none whitespace-nowrap shadow-lg z-30 flex items-center gap-2 border border-[#C9A227]/40">
                          {isBest && <Crown className="w-3.5 h-3.5 text-[#E2B755] flex-shrink-0" />}
                          <div className="flex flex-col text-left">
                            <span>{currency}{d.sales.toLocaleString()} · {d.orders} orders</span>
                            <span className="text-[9px] text-[#C9A227] font-medium">{d.fullDate || d.label}</span>
                          </div>
                        </div>

                        {/* Direct Top Value Badge */}
                        <div className="h-5 flex items-center justify-center">
                          {d.sales > 0 ? (
                            <span
                              className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-md leading-none truncate max-w-full ${
                                isBest
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : "bg-emerald-50 text-[#12372A] border border-emerald-200"
                              }`}
                            >
                              {currency}{d.sales >= 1000 ? `${(d.sales / 1000).toFixed(1)}k` : d.sales}
                            </span>
                          ) : (
                            <span className="text-[9px] text-stone-300 font-bold">·</span>
                          )}
                        </div>

                        {/* Bar Pillar Track (Fixed h-44 = 176px with bottom alignment) */}
                        <div className="w-full h-44 bg-[#FAF9F6] rounded-xl flex flex-col justify-end p-1.5 border border-[#E5E2D9] group-hover:border-[#12372A]/50 transition shadow-2xs relative overflow-hidden">
                          {/* Filled Bar */}
                          <div
                            style={{
                              height: `${d.sales > 0 ? Math.max(heightPercent, 12) : 5}%`,
                            }}
                            className={`w-full rounded-lg transition-all duration-300 flex flex-col items-center justify-start pt-1 ${
                              isBest
                                ? "bg-gradient-to-t from-[#C9A227] via-[#DFB843] to-[#F3D57B] shadow-sm"
                                : isHovered
                                ? "bg-[#12372A] shadow-sm"
                                : d.sales > 0
                                ? "bg-gradient-to-t from-[#12372A] to-[#1e5843] group-hover:from-[#0e2b21] group-hover:to-[#174635]"
                                : "bg-stone-200/60"
                            }`}
                          >
                            {isBest && heightPercent > 35 && (
                              <Crown className="w-3 h-3 text-[#12372A]/70" />
                            )}
                          </div>
                        </div>

                        {/* Day Label with clear 2-line layout */}
                        <div className="flex flex-col items-center text-center mt-0.5">
                          <span
                            className={`text-[10px] font-extrabold truncate max-w-full leading-tight ${
                              isBest ? "text-[#C9A227]" : d.sales > 0 ? "text-[#171717]" : "text-[#9CA3AF]"
                            }`}
                          >
                            {d.label}
                          </span>
                          {d.orders > 0 && (
                            <span className="text-[9px] font-semibold text-[#6B7280] leading-none mt-0.5">
                              {d.orders} ord
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Chart footer summary line */}
          <div className="pt-4 border-t border-[#E5E2D9] flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B7280]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#12372A]" />
              <span className="font-semibold text-[11px]">Regular Days</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#C9A227] ml-2" />
              <span className="font-semibold text-[11px]">Peak Day</span>
              <span className="w-2.5 h-2.5 rounded-full bg-stone-300 ml-2" />
              <span className="font-semibold text-[11px]">Zero Orders</span>
            </div>
            <div className="font-bold text-[#171717] text-[11px]">
              Daily Avg: {currency}{Math.round((data?.summary?.totalRevenue || 0) / Math.max(displayDays.length, 1)).toLocaleString()} / day
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Top Selling Items Leaderboard */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#E5E2D9] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#171717] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C9A227]" />
                  Top Menu Items Velocity
                </h3>
                <p className="text-xs text-[#6B7280]">Ranked by total units sold in period</p>
              </div>
              <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider bg-[#FAF9F6] border border-[#E5E2D9] px-2 py-1 rounded-lg">
                Leaderboard
              </span>
            </div>

            {/* Items list */}
            <div className="space-y-3.5">
              {(data?.popularFoods || []).length === 0 ? (
                <div className="py-12 text-center text-xs text-[#6B7280]">
                  No items sold in the selected period.
                </div>
              ) : (
                (data?.popularFoods || []).slice(0, 5).map((food, idx) => {
                  const widthPercent = Math.round((food.count / maxFoodCount) * 100);
                  const rankColors = [
                    "bg-amber-100 text-amber-800 border-amber-300",
                    "bg-slate-100 text-slate-700 border-slate-300",
                    "bg-orange-100 text-orange-800 border-orange-300",
                  ];

                  return (
                    <div key={idx} className="space-y-1.5 group">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Rank Badge */}
                          <span
                            className={`w-5 h-5 rounded-md border text-[10px] font-black flex items-center justify-center flex-shrink-0 ${
                              rankColors[idx] || "bg-stone-50 text-stone-600 border-stone-200"
                            }`}
                          >
                            {idx + 1}
                          </span>

                          {/* Veg / Non-Veg dot */}
                          <span
                            className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                              food.isVeg ? "border-emerald-600" : "border-red-600"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                food.isVeg ? "bg-emerald-600" : "bg-red-600"
                              }`}
                            />
                          </span>

                          {/* Food Name */}
                          <span
                            className="font-bold text-[#171717] truncate max-w-[160px] sm:max-w-[200px]"
                            title={food.name}
                          >
                            {food.name}
                          </span>
                        </div>

                        {/* Revenue & Units */}
                        <div className="text-right flex-shrink-0">
                          <span className="font-black text-[#12372A] text-xs">
                            {currency}{food.revenue.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-[#6B7280] font-semibold ml-1.5">
                            ({food.count} units)
                          </span>
                        </div>
                      </div>

                      {/* Gradient Progress Bar */}
                      <div className="h-2 w-full bg-[#FAF9F6] rounded-full overflow-hidden border border-[#E5E2D9]/40">
                        <div
                          style={{ width: `${Math.max(widthPercent, 8)}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            idx === 0
                              ? "bg-gradient-to-r from-[#12372A] via-[#1a4a38] to-[#C9A227]"
                              : idx === 1
                              ? "bg-gradient-to-r from-[#12372A] to-emerald-600"
                              : "bg-[#12372A]/70"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3.5 border-t border-[#E5E2D9] mt-3 flex items-center justify-between text-[11px] text-[#6B7280]">
            <span>
              Total Units Sold: <strong className="text-[#171717]">{data?.summary?.totalItemsSold || 0}</strong>
            </span>
            <span className="text-[#12372A] font-bold">Top 5 account for majority of sales</span>
          </div>
        </div>
      </div>

      {/* ───── Bottom Analytics: 3 Structured Cards ───── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Peak Dining Hours Rush */}
        <div className="bg-white rounded-3xl p-5 border border-[#E5E2D9] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-extrabold text-[#171717] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#12372A]" />
                  Peak Dining Hours
                </h3>
                <p className="text-[11px] text-[#6B7280]">Table order density across day</p>
              </div>
            </div>

            {/* Hover details badge */}
            <div className="h-5 flex items-center mb-1 text-[10px]">
              {hoveredHour ? (
                <span className="font-bold text-[#12372A]">
                  {hoveredHour.name} ({hoveredHour.label}): {hoveredHour.count} orders · {currency}{hoveredHour.sales}
                </span>
              ) : (
                <span className="text-[#9CA3AF]">Hover to inspect rush hours</span>
              )}
            </div>

            {/* Hour Pillars (Solid Fixed Track Height h-32 = 128px) */}
            <div className="flex items-end justify-between gap-1.5 pt-2 pb-1 min-h-[190px]">
              {(data?.hours || []).map((h, idx) => {
                const heightPercent = Math.round((h.count / maxHourCount) * 100);
                const isRush = h.count >= Math.max(maxHourCount * 0.7, 3);
                const isHovered = hoveredHour?.hour === h.hour;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredHour(h)}
                    onMouseLeave={() => setHoveredHour(null)}
                    className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer"
                  >
                    {/* Floating tooltip */}
                    <div className="absolute -top-11 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[#12372A] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-xl pointer-events-none whitespace-nowrap shadow-md z-30 flex flex-col items-center border border-[#C9A227]/40">
                      <span>{h.name} ({h.label})</span>
                      <span className="text-[#C9A227]">{h.count} orders · {currency}{h.sales.toLocaleString()}</span>
                    </div>

                    {/* Order count pill on top */}
                    <div className="h-4 flex items-center justify-center">
                      {h.count > 0 ? (
                        <span
                          className={`text-[9px] font-black leading-none ${
                            isRush ? "text-amber-800 bg-amber-100 px-1 py-0.5 rounded" : "text-[#12372A]"
                          }`}
                        >
                          {h.count}
                        </span>
                      ) : (
                        <span className="text-[9px] text-stone-300">·</span>
                      )}
                    </div>

                    {/* Hour Pillar Track (Fixed h-32 = 128px with bottom alignment) */}
                    <div className="w-full h-32 bg-[#FAF9F6] rounded-xl flex flex-col justify-end p-1 border border-[#E5E2D9] group-hover:border-[#12372A]/50 transition shadow-2xs relative overflow-hidden">
                      <div
                        style={{ height: `${h.count > 0 ? Math.max(heightPercent, 12) : 4}%` }}
                        className={`w-full rounded-lg transition-all duration-300 ${
                          isRush
                            ? "bg-gradient-to-t from-[#C9A227] to-[#E5C259] shadow-xs"
                            : isHovered
                            ? "bg-[#12372A] shadow-xs"
                            : h.count > 0
                            ? "bg-gradient-to-t from-[#12372A] to-[#1e5843]"
                            : "bg-stone-200/50"
                        }`}
                      />
                    </div>

                    {/* Hour label below */}
                    <span className="text-[9px] font-extrabold text-[#6B7280] group-hover:text-[#171717] mt-0.5">
                      {h.label.replace(" ", "")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E2D9] mt-2 flex items-center justify-between text-[11px] text-[#6B7280]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#C9A227]" />
              <strong>Peak Rush (11 AM & 10 PM)</strong>
            </span>
            <span className="text-[#12372A] font-bold text-[10px]">
              Top: {data?.hours?.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), data?.hours[0])?.label || "11 AM"}
            </span>
          </div>
        </div>

        {/* Card 2: Payment Settlement Channels */}
        <div className="bg-white rounded-3xl p-5 border border-[#E5E2D9] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-extrabold text-[#171717] uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#12372A]" />
                  Settlement Channels
                </h3>
                <p className="text-[11px] text-[#6B7280]">Payment mode distribution</p>
              </div>
            </div>

            <div className="space-y-3.5 pt-2">
              {(data?.paymentMethods || []).map((p, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#171717] flex items-center gap-1.5">
                      {p.method === "UPI / QR" && <QrCode className="w-3.5 h-3.5 text-violet-600" />}
                      {p.method === "Cash at Counter" && <Banknote className="w-3.5 h-3.5 text-amber-600" />}
                      {p.method.includes("Card") && <CreditCard className="w-3.5 h-3.5 text-blue-600" />}
                      {p.method}
                    </span>
                    <span className="font-extrabold text-[#12372A]">
                      {p.percent}% ({currency}{p.amount.toLocaleString()})
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-[#FAF9F6] rounded-full overflow-hidden border border-[#E5E2D9]/40">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(p.percent, 3)}%`,
                        backgroundColor: p.color,
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-[#6B7280] font-medium text-right">
                    {p.count} settlements
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E2D9] mt-2 flex items-center justify-between text-[11px] text-[#6B7280]">
            <span>Fast Digital UPI & Cash dominant</span>
            <span className="font-bold text-[#12372A]">100% Settled</span>
          </div>
        </div>

        {/* Card 3: Category Performance Breakdown */}
        <div className="bg-white rounded-3xl p-5 border border-[#E5E2D9] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-extrabold text-[#171717] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#12372A]" />
                  Category Contribution
                </h3>
                <p className="text-[11px] text-[#6B7280]">Revenue share by menu division</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {(data?.categorySales || []).map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#171717] truncate max-w-[140px]">
                      {cat.name}
                    </span>
                    <span className="font-extrabold text-[#12372A]">
                      {cat.percent}% ({currency}{cat.revenue.toLocaleString()})
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#FAF9F6] rounded-full overflow-hidden border border-[#E5E2D9]/40">
                    <div
                      style={{ width: `${Math.max(cat.percent, 4)}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0
                          ? "bg-[#12372A]"
                          : idx === 1
                          ? "bg-[#C9A227]"
                          : "bg-stone-500"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E2D9] mt-2 flex items-center justify-between text-[11px] text-[#6B7280]">
            <span>
              Leading: <strong className="text-[#12372A]">{data?.categorySales?.[0]?.name || "Biriyani"}</strong>
            </span>
            <span className="text-[10px] text-[#6B7280] font-semibold">{data?.categorySales?.length || 0} categories</span>
          </div>
        </div>
      </div>
    </div>
  );
}
