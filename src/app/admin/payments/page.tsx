"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Receipt,
  Search,
  Printer,
  RefreshCw,
  CheckCircle2,
  Clock,
  CreditCard,
  Banknote,
  QrCode,
  X,
  Loader2,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  Filter,
  Download,
  DollarSign,
  Eye,
} from "lucide-react";

// ─────────────────────── Types ───────────────────────
interface BillData {
  id: number;
  billNumber: string;
  orderId: number;
  hotelId: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paymentStatus: "PAID" | "PENDING";
  paymentMethod?: "CASH" | "UPI" | "CARD" | null;
  generatedAt: string;
  paidAt?: string | null;
  order?: {
    id: number;
    orderNumber: string;
    customerName?: string;
    customerPhone?: string;
    table?: { tableNumber: string } | null;
    items?: any[];
  };
}

// ─────────────────────── Helpers ───────────────────────
function formatDate(d: string) {
  return new Date(d).toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDateRange(preset: string): { start: string; end: string } {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);

  switch (preset) {
    case "TODAY":
      return { start: toISO(now), end: toISO(now) };
    case "YESTERDAY": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { start: toISO(y), end: toISO(y) };
    }
    case "WEEK": {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      return { start: toISO(w), end: toISO(now) };
    }
    case "MONTH": {
      const m = new Date(now);
      m.setMonth(m.getMonth() - 1);
      return { start: toISO(m), end: toISO(now) };
    }
    default:
      return { start: "", end: "" };
  }
}

// ─────────────────────── Component ───────────────────────
export default function PaymentsAndBillsPage() {
  const [bills, setBills] = useState<BillData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID">("ALL");
  const [methodFilter, setMethodFilter] = useState<"ALL" | "CASH" | "UPI" | "CARD">("ALL");
  const [datePreset, setDatePreset] = useState<"ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "CUSTOM">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination (selectable: 10, 25, 50, 100)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Settle modal state
  const [settleBillData, setSettleBillData] = useState<BillData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [isSettling, setIsSettling] = useState(false);

  // Excel export modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPreset, setExportPreset] = useState<"ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "CUSTOM">("TODAY");
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportStatus, setExportStatus] = useState<"ALL" | "PAID">("ALL");
  const [exporting, setExporting] = useState(false);

  const currency = "₹";

  // ─── Fetch ───
  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/bills");
      const data = await res.json();
      if (res.ok) {
        setBills(data.bills || []);
      }
    } catch (err) {
      console.error("Failed to load bills:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // ─── Date preset handler ───
  useEffect(() => {
    if (datePreset !== "CUSTOM" && datePreset !== "ALL") {
      const { start, end } = getDateRange(datePreset);
      setStartDate(start);
      setEndDate(end);
    } else if (datePreset === "ALL") {
      setStartDate("");
      setEndDate("");
    }
  }, [datePreset]);

  // ─── Reset page on filter/search changes ───
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, methodFilter, startDate, endDate]);

  // ─── Filtered + Searched Bills ───
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          b.billNumber.toLowerCase().includes(q) ||
          b.order?.orderNumber?.toLowerCase().includes(q) ||
          b.order?.customerName?.toLowerCase().includes(q) ||
          b.order?.customerPhone?.includes(q) ||
          b.order?.table?.tableNumber?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "ALL" && b.paymentStatus !== statusFilter) return false;

      // Method filter
      if (methodFilter !== "ALL") {
        if (!b.paymentMethod || b.paymentMethod !== methodFilter) return false;
      }

      // Date filter
      if (startDate) {
        const billDate = new Date(b.generatedAt).toISOString().slice(0, 10);
        if (billDate < startDate) return false;
      }
      if (endDate) {
        const billDate = new Date(b.generatedAt).toISOString().slice(0, 10);
        if (billDate > endDate) return false;
      }

      return true;
    });
  }, [bills, searchQuery, statusFilter, methodFilter, startDate, endDate]);

  // ─── Pagination ───
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage) || 1;
  const paginatedBills = filteredBills.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ─── Summary stats ───
  const stats = useMemo(() => {
    const total = filteredBills.reduce((sum, b) => sum + b.grandTotal, 0);
    const paid = filteredBills.filter((b) => b.paymentStatus === "PAID");
    const pending = filteredBills.filter((b) => b.paymentStatus === "PENDING");
    const paidTotal = paid.reduce((sum, b) => sum + b.grandTotal, 0);
    const pendingTotal = pending.reduce((sum, b) => sum + b.grandTotal, 0);

    const cashTotal = filteredBills.filter((b) => b.paymentMethod === "CASH").reduce((s, b) => s + b.grandTotal, 0);
    const upiTotal = filteredBills.filter((b) => b.paymentMethod === "UPI").reduce((s, b) => s + b.grandTotal, 0);
    const cardTotal = filteredBills.filter((b) => b.paymentMethod === "CARD").reduce((s, b) => s + b.grandTotal, 0);

    return { total, paidCount: paid.length, pendingCount: pending.length, paidTotal, pendingTotal, cashTotal, upiTotal, cardTotal };
  }, [filteredBills]);

  // ─── Settle Bill ───
  const handleConfirmSettle = async () => {
    if (!settleBillData) return;
    try {
      setIsSettling(true);
      const res = await fetch("/api/admin/bills", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billId: settleBillData.id, paymentMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to settle bill");

      setSettleBillData(null);
      await fetchBills();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error settling bill";
      alert(msg);
    } finally {
      setIsSettling(false);
    }
  };

  // ─── Excel Export ───
  const handleExportExcel = () => {
    let exportData = [...bills];

    // Apply export filters
    if (exportStatus !== "ALL") {
      exportData = exportData.filter((b) => b.paymentStatus === exportStatus);
    }

    if (exportPreset !== "ALL") {
      let eStart = exportStartDate;
      let eEnd = exportEndDate;
      if (exportPreset !== "CUSTOM") {
        const range = getDateRange(exportPreset);
        eStart = range.start;
        eEnd = range.end;
      }
      if (eStart) exportData = exportData.filter((b) => new Date(b.generatedAt).toISOString().slice(0, 10) >= eStart);
      if (eEnd) exportData = exportData.filter((b) => new Date(b.generatedAt).toISOString().slice(0, 10) <= eEnd);
    }

    if (exportData.length === 0) {
      alert("No records found for the selected filters.");
      return;
    }

    setExporting(true);

    const rows = exportData.map((b, i) => ({
      "S.No": i + 1,
      "Bill Number": b.billNumber,
      "Order Ref": b.order?.orderNumber ? `#${b.order.orderNumber}` : "-",
      "Table": b.order?.table?.tableNumber || "-",
      "Customer Name": b.order?.customerName || "-",
      "Phone": b.order?.customerPhone || "-",
      "Subtotal (₹)": Number(b.subtotal.toFixed(2)),
      "GST (₹)": Number(b.taxAmount.toFixed(2)),
      "Discount (₹)": Number(b.discountAmount.toFixed(2)),
      "Grand Total (₹)": Number(b.grandTotal.toFixed(2)),
      "Payment Status": b.paymentStatus,
      "Payment Method": b.paymentMethod || "-",
      "Generated Date": formatDate(b.generatedAt),
      "Paid Date": b.paidAt ? formatDate(b.paidAt) : "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 6 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 22 },
      { wch: 15 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 16 },
      { wch: 15 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payments & Bills");

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Annapoorna_Payments_Bills_${today}.xlsx`);

    setExporting(false);
    setShowExportModal(false);
  };

  // ─── Page navigation helpers ───
  const getVisiblePages = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  // ─────────────────────── RENDER ───────────────────────
  return (
    <div className="space-y-5">
      {/* ───── Header ───── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5E2D9] pb-4">
        <div>
          <h2 className="text-2xl font-black text-[#171717] tracking-tight flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#12372A] to-[#1a4a38] flex items-center justify-center shadow-sm">
              <Receipt className="w-4.5 h-4.5 text-[#C9A227]" />
            </div>
            Payments & Bills
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5 ml-11">
            Unified payment collection, bill settlement & invoice management
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Excel */}
          <button
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E2D9] hover:bg-emerald-50 text-xs font-bold text-[#12372A] flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#C9A227]" />
            Export Excel
          </button>

          {/* Refresh */}
          <button
            onClick={fetchBills}
            className="p-2 rounded-xl bg-white border border-[#E5E2D9] hover:bg-stone-50 text-[#6B7280] transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ───── Stats Cards (Paid, UPI, Cash) ───── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Paid */}
        <div className="bg-white rounded-2xl p-4 border border-[#E5E2D9] shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Paid Settlements</span>
          </div>
          <div className="text-xl font-black text-[#171717]">{currency}{stats.paidTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div className="text-[10px] text-emerald-600 font-semibold">{stats.paidCount} settled bills</div>
        </div>

        {/* UPI */}
        <div className="bg-white rounded-2xl p-4 border border-[#E5E2D9] shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
              <QrCode className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">UPI / QR</span>
          </div>
          <div className="text-xl font-black text-[#171717]">{currency}{stats.upiTotal.toLocaleString("en-IN")}</div>
          <div className="text-[10px] text-[#6B7280] font-semibold">Online settlements</div>
        </div>

        {/* Cash */}
        <div className="bg-white rounded-2xl p-4 border border-[#E5E2D9] shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <Banknote className="w-3.5 h-3.5 text-[#C9A227]" />
            </div>
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Cash</span>
          </div>
          <div className="text-xl font-black text-[#171717]">{currency}{stats.cashTotal.toLocaleString("en-IN")}</div>
          <div className="text-[10px] text-[#6B7280] font-semibold">Counter settlements</div>
        </div>
      </div>

      {/* ───── Search + Filter Row ───── */}
      <div className="bg-white rounded-2xl border border-[#E5E2D9] shadow-2xs p-3.5 space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bill no, order, customer, phone, table..."
              className="w-full pl-8.5 pr-3 py-2 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs text-[#171717] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 focus:border-[#12372A] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-stone-200 text-[#6B7280] hover:bg-stone-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Toggle Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              showFilters
                ? "bg-[#12372A] text-white border-[#12372A]"
                : "bg-white text-[#6B7280] border-[#E5E2D9] hover:bg-stone-50"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {(statusFilter !== "ALL" || methodFilter !== "ALL" || datePreset !== "ALL") && (
              <span className="w-4 h-4 rounded-full bg-[#C9A227] text-[9px] font-black text-white flex items-center justify-center">
                {[statusFilter !== "ALL", methodFilter !== "ALL", datePreset !== "ALL"].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Quick Status Chips */}
          <div className="flex items-center gap-1.5">
            {(["ALL", "PAID"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                  statusFilter === s
                    ? "bg-[#12372A] text-white shadow-sm"
                    : "bg-[#FAF9F6] text-[#6B7280] border border-[#E5E2D9] hover:bg-stone-100"
                }`}
              >
                {s === "ALL" ? "All Bills" : "Paid Only"}
              </button>
            ))}
          </div>
        </div>

        {/* ───── Expanded Filters ───── */}
        {showFilters && (
          <div className="pt-3 border-t border-[#E5E2D9] grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Payment Method</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["ALL", "CASH", "UPI", "CARD"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethodFilter(m)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                      methodFilter === m
                        ? "bg-[#12372A] text-white"
                        : "bg-[#FAF9F6] text-[#6B7280] border border-[#E5E2D9]"
                    }`}
                  >
                    {m === "CASH" && <Banknote className="w-3 h-3" />}
                    {m === "UPI" && <QrCode className="w-3 h-3" />}
                    {m === "CARD" && <CreditCard className="w-3 h-3" />}
                    {m === "ALL" ? "All Methods" : m}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Preset */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Date Range</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["ALL", "TODAY", "YESTERDAY", "WEEK", "MONTH", "CUSTOM"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDatePreset(d)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      datePreset === d
                        ? "bg-[#12372A] text-white"
                        : "bg-[#FAF9F6] text-[#6B7280] border border-[#E5E2D9]"
                    }`}
                  >
                    {d === "ALL" ? "All Time" : d === "WEEK" ? "Last 7 Days" : d === "MONTH" ? "Last 30 Days" : d.charAt(0) + d.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Inputs */}
            {datePreset === "CUSTOM" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Custom Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E5E2D9] text-xs text-[#171717] bg-[#FAF9F6] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                  />
                  <span className="text-[10px] text-[#6B7280] font-bold">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E5E2D9] text-xs text-[#171717] bg-[#FAF9F6] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                  />
                </div>
              </div>
            )}

            {/* Clear Filters */}
            {(statusFilter !== "ALL" || methodFilter !== "ALL" || datePreset !== "ALL") && (
              <div className="sm:col-span-3 flex justify-end">
                <button
                  onClick={() => {
                    setStatusFilter("ALL");
                    setMethodFilter("ALL");
                    setDatePreset("ALL");
                    setSearchQuery("");
                  }}
                  className="text-[10px] font-bold text-red-500 hover:text-red-700 transition cursor-pointer"
                >
                  ✕ Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ───── Main Table ───── */}
      <div className="bg-white rounded-2xl border border-[#E5E2D9] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gradient-to-r from-[#FAF9F6] to-[#F3F0E8] border-b border-[#E5E2D9]">
              <tr>
                <th className="py-3.5 px-4 text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">#</th>
                <th className="py-3.5 px-4 text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">Bill</th>
                <th className="py-3.5 px-4 text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">Order</th>
                <th className="py-3.5 px-4 text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">Table</th>
                <th className="py-3.5 px-4 text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">Customer</th>
                <th className="py-3.5 px-4 text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider text-right">Amount</th>
                <th className="py-3.5 px-4 text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">Method</th>
                <th className="py-3.5 px-4 text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">Status</th>
                <th className="py-3.5 px-4 text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">Date & Time</th>
                <th className="py-3.5 px-4 text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#12372A]" />
                      <span className="text-xs text-[#6B7280]">Loading payments & bills...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedBills.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="w-8 h-8 text-[#E5E2D9]" />
                      <span className="text-xs text-[#6B7280]">No bills found for the current filters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedBills.map((bill, idx) => {
                  const isPaid = bill.paymentStatus === "PAID";
                  const serialNo = (currentPage - 1) * itemsPerPage + idx + 1;

                  return (
                    <tr key={bill.id} className="hover:bg-[#FDFCF8] transition group">
                      {/* Serial */}
                      <td className="py-3.5 px-4 text-[#9CA3AF] font-semibold">{serialNo}</td>

                      {/* Bill Number — clickable */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/bill/${bill.orderId}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#12372A]/5 to-[#12372A]/10 text-[#12372A] font-extrabold text-[11px] hover:from-[#12372A]/10 hover:to-[#12372A]/20 transition group-hover:shadow-sm"
                        >
                          <Receipt className="w-3 h-3 text-[#C9A227]" />
                          {bill.billNumber}
                        </Link>
                      </td>

                      {/* Order Ref */}
                      <td className="py-3.5 px-4 font-bold text-[#12372A]">
                        #{bill.order?.orderNumber}
                      </td>

                      {/* Table */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E5E2D9] text-[10px] font-bold text-[#171717]">
                          {bill.order?.table?.tableNumber || "—"}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#171717] text-[11px]">
                          {bill.order?.customerName || "Walk-in"}
                        </div>
                        {bill.order?.customerPhone && (
                          <div className="text-[10px] text-[#9CA3AF]">{bill.order.customerPhone}</div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black text-sm text-[#12372A]">
                          {currency}{bill.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        {bill.taxAmount > 0 && (
                          <div className="text-[9px] text-[#9CA3AF]">
                            GST: {currency}{bill.taxAmount.toFixed(2)}
                          </div>
                        )}
                      </td>

                      {/* Method */}
                      <td className="py-3.5 px-4">
                        {bill.paymentMethod ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${
                            bill.paymentMethod === "CASH"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : bill.paymentMethod === "UPI"
                              ? "bg-violet-50 text-violet-700 border border-violet-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}>
                            {bill.paymentMethod === "CASH" && <Banknote className="w-3 h-3" />}
                            {bill.paymentMethod === "UPI" && <QrCode className="w-3 h-3" />}
                            {bill.paymentMethod === "CARD" && <CreditCard className="w-3 h-3" />}
                            {bill.paymentMethod}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#9CA3AF]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {bill.paymentStatus}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] font-semibold text-[#171717]">{formatDate(bill.generatedAt)}</div>
                        <div className="text-[10px] text-[#9CA3AF]">{formatTime(bill.generatedAt)}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid && (
                            <button
                              onClick={() => {
                                setSettleBillData(bill);
                                setPaymentMethod("CASH");
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-sm"
                            >
                              <CreditCard className="w-3 h-3 text-emerald-200" />
                              Settle
                            </button>
                          )}

                          <Link
                            href={`/bill/${bill.orderId}`}
                            target="_blank"
                            className="px-2.5 py-1.5 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] text-white text-[10px] font-bold flex items-center gap-1 transition shadow-sm"
                          >
                            <Eye className="w-3 h-3 text-[#C9A227]" />
                            Bill
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ───── Interactive Pagination Footer ───── */}
        {!loading && filteredBills.length > 0 && (
          <div className="p-3.5 bg-[#FAF9F6] border-t border-[#E5E2D9] flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#6B7280]">
            {/* Left: Summary & Rows Selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-[11px] text-[#171717]">
                Showing <strong className="text-[#12372A]">{(currentPage - 1) * itemsPerPage + 1}</strong> –{" "}
                <strong className="text-[#12372A]">{Math.min(currentPage * itemsPerPage, filteredBills.length)}</strong> of{" "}
                <strong className="text-[#12372A]">{filteredBills.length}</strong> bills
              </span>

              <div className="flex items-center gap-1.5 pl-2 border-l border-[#E5E2D9]">
                <span className="text-[11px] font-bold text-[#6B7280]">Rows:</span>
                <div className="flex items-center rounded-lg border border-[#E5E2D9] overflow-hidden bg-white shadow-2xs">
                  {[10, 25, 50, 100].map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        setItemsPerPage(size);
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                        itemsPerPage === size
                          ? "bg-[#12372A] text-white shadow-xs"
                          : "text-[#6B7280] hover:bg-stone-100 hover:text-[#171717]"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Direct Page Chooser & Numbered Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Page Select Dropdown */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-[#6B7280]">
                  <span>Page</span>
                  <select
                    value={currentPage}
                    onChange={(e) => setCurrentPage(Number(e.target.value))}
                    className="bg-white border border-[#E5E2D9] rounded-lg px-2 py-1 text-xs font-bold text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A] cursor-pointer"
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>
                        {p} of {totalPages}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Numbered Controls */}
              <div className="flex items-center gap-1">
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage <= 1}
                  className="w-8 h-8 rounded-lg border border-[#E5E2D9] bg-white text-[#6B7280] hover:bg-stone-50 disabled:opacity-30 flex items-center justify-center transition cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>

                {/* Prev Page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-2 h-8 rounded-lg border border-[#E5E2D9] bg-white text-[#6B7280] hover:bg-stone-50 disabled:opacity-30 flex items-center justify-center gap-1 font-bold text-xs transition cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                {/* Numbers */}
                {getVisiblePages().map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                      currentPage === p
                        ? "bg-[#12372A] text-white shadow-xs"
                        : "border border-[#E5E2D9] bg-white text-[#6B7280] hover:bg-stone-50 shadow-2xs"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                {/* Next Page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-2 h-8 rounded-lg border border-[#E5E2D9] bg-white text-[#6B7280] hover:bg-stone-50 disabled:opacity-30 flex items-center justify-center gap-1 font-bold text-xs transition cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                  title="Next Page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Last Page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="w-8 h-8 rounded-lg border border-[#E5E2D9] bg-white text-[#6B7280] hover:bg-stone-50 disabled:opacity-30 flex items-center justify-center transition cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════ Settle Bill Modal ═══════════════ */}
      {settleBillData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-black/10 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-black/5 pb-3">
              <div>
                <h3 className="text-base font-black text-[#171717]">
                  Collect Payment & Settle
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Bill {settleBillData.billNumber} · {settleBillData.order?.table?.tableNumber || "Table"}
                </p>
              </div>
              <button
                onClick={() => setSettleBillData(null)}
                className="w-7 h-7 rounded-full bg-stone-100 text-[#6B7280] hover:bg-stone-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-[#FAF9F6] p-3.5 rounded-2xl border border-black/5 space-y-1.5 text-xs">
              <div className="flex justify-between text-[#6B7280]">
                <span>Customer:</span>
                <span className="font-bold text-[#171717]">{settleBillData.order?.customerName || "Walk-in"}</span>
              </div>
              <div className="flex justify-between text-[#6B7280]">
                <span>Order Reference:</span>
                <span className="font-bold text-[#12372A]">#{settleBillData.order?.orderNumber}</span>
              </div>
              <div className="pt-2 border-t border-black/5 flex justify-between text-sm font-black text-[#12372A]">
                <span>Total Due:</span>
                <span>{currency}{settleBillData.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#171717] block">Payment Method:</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: "CASH" as const, label: "Cash", Icon: Banknote },
                  { key: "UPI" as const, label: "UPI / QR", Icon: QrCode },
                  { key: "CARD" as const, label: "Card / POS", Icon: CreditCard },
                ]).map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPaymentMethod(key)}
                    className={`p-2.5 rounded-xl border-2 text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                      paymentMethod === key
                        ? "border-[#12372A] bg-emerald-50 text-[#12372A] font-bold"
                        : "border-black/10 bg-white text-[#6B7280]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px]">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSettleBillData(null)}
                className="flex-1 py-2.5 rounded-xl border border-black/10 text-xs font-bold text-[#6B7280] hover:bg-stone-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSettle}
                disabled={isSettling}
                className="flex-[2] py-2.5 px-4 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-[0.98] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                {isSettling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#C9A227]" />
                    <span>Confirm Paid</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ Excel Export Modal ═══════════════ */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-black/10 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-black/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#12372A] to-[#1a4a38] flex items-center justify-center">
                  <Download className="w-4 h-4 text-[#C9A227]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#171717]">Export to Excel</h3>
                  <p className="text-[10px] text-[#6B7280]">Download payments & bills as .xlsx</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-7 h-7 rounded-full bg-stone-100 text-[#6B7280] hover:bg-stone-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Date range picker */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Date Range</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["ALL", "TODAY", "YESTERDAY", "WEEK", "MONTH", "CUSTOM"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setExportPreset(d)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      exportPreset === d
                        ? "bg-[#12372A] text-white"
                        : "bg-[#FAF9F6] text-[#6B7280] border border-[#E5E2D9]"
                    }`}
                  >
                    {d === "ALL" ? "All Time" : d === "WEEK" ? "7 Days" : d === "MONTH" ? "30 Days" : d.charAt(0) + d.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {exportPreset === "CUSTOM" && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E5E2D9] text-xs text-[#171717] bg-[#FAF9F6] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                  />
                  <span className="text-[10px] text-[#6B7280] font-bold">to</span>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E5E2D9] text-xs text-[#171717] bg-[#FAF9F6] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                  />
                </div>
              )}
            </div>

            {/* Status filter for export */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Payment Status</label>
              <div className="flex items-center gap-1.5">
                {(["ALL", "PAID"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setExportStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      exportStatus === s
                        ? "bg-[#12372A] text-white"
                        : "bg-[#FAF9F6] text-[#6B7280] border border-[#E5E2D9]"
                    }`}
                  >
                    {s === "ALL" ? "All" : "Paid Only"}
                  </button>
                ))}
              </div>
            </div>

            {/* Export button */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-black/10 text-xs font-bold text-[#6B7280] hover:bg-stone-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExportExcel}
                disabled={exporting}
                className="flex-[2] py-2.5 px-4 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-[0.98] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 text-[#C9A227]" />
                    <span>Download .xlsx</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
