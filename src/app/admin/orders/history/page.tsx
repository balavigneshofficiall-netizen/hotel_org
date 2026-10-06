"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  History,
  Search,
  Printer,
  CheckCircle2,
  XCircle,
  Receipt,
  Clock,
  Calendar,
  FileSpreadsheet,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Loader2,
  CalendarRange,
  UtensilsCrossed,
} from "lucide-react";
import OrderDetailDrawer from "@/components/admin/OrderDetailDrawer";

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "CANCELLED">("ALL");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Date Filtering States for On-Screen Table
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [datePreset, setDatePreset] = useState<"ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "CUSTOM">("ALL");

  // Excel Export Modal States
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportPreset, setExportPreset] = useState<"ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "CUSTOM">("TODAY");
  const [exportStatus, setExportStatus] = useState<"ALL" | "COMPLETED" | "CANCELLED">("ALL");
  const [exporting, setExporting] = useState(false);

  // Pagination with default 50 items per page
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  const [jumpPageInput, setJumpPageInput] = useState("");

  const tableTopRef = useRef<HTMLDivElement>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/admin/orders?history=true&status=${statusFilter}&_t=${Date.now()}`;
      if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
      if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to load order history:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const currency = "₹";

  const formatDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Handle Preset Quick Click for on-screen table
  const handlePresetSelect = (preset: "ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "CUSTOM") => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === "ALL") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "TODAY") {
      const todayStr = formatDateStr(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "YESTERDAY") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatDateStr(y);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "WEEK") {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      setStartDate(formatDateStr(w));
      setEndDate(formatDateStr(now));
    } else if (preset === "MONTH") {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatDateStr(m));
      setEndDate(formatDateStr(now));
    }
    setCurrentPage(1);
  };

  // Open Export Modal and sync with current filters
  const handleOpenExportModal = () => {
    const now = new Date();
    if (startDate || endDate) {
      setExportStartDate(startDate);
      setExportEndDate(endDate || startDate);
      setExportPreset(datePreset);
    } else {
      // Default export to Today if no filter is set
      const todayStr = formatDateStr(now);
      setExportStartDate(todayStr);
      setExportEndDate(todayStr);
      setExportPreset("TODAY");
    }
    setExportStatus(statusFilter);
    setShowExportModal(true);
  };

  // Handle preset change inside Export Modal
  const handleExportPresetSelect = (preset: "ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "CUSTOM") => {
    setExportPreset(preset);
    const now = new Date();

    if (preset === "ALL") {
      setExportStartDate("");
      setExportEndDate("");
    } else if (preset === "TODAY") {
      const todayStr = formatDateStr(now);
      setExportStartDate(todayStr);
      setExportEndDate(todayStr);
    } else if (preset === "YESTERDAY") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatDateStr(y);
      setExportStartDate(yStr);
      setExportEndDate(yStr);
    } else if (preset === "WEEK") {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      setExportStartDate(formatDateStr(w));
      setExportEndDate(formatDateStr(now));
    } else if (preset === "MONTH") {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      setExportStartDate(formatDateStr(m));
      setExportEndDate(formatDateStr(now));
    }
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setDatePreset("CUSTOM");
    setCurrentPage(1);
  };

  const clearDateFilter = () => {
    setDatePreset("ALL");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  // Filter orders by search query
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerPhone?.includes(q) ||
        o.table?.tableNumber?.toLowerCase().includes(q)
      );
    });
  }, [orders, searchQuery]);

  // Statistics calculation for the header cards
  const stats = useMemo(() => {
    const completedList = orders.filter((o) => o.status === "COMPLETED");
    const cancelledList = orders.filter((o) => o.status === "CANCELLED");
    const totalCompletedRevenue = completedList.reduce(
      (sum, o) => sum + (o.totalAmount || 0),
      0
    );

    return {
      completedCount: completedList.length,
      cancelledCount: cancelledList.length,
      completedRevenue: totalCompletedRevenue,
      totalCount: orders.length,
    };
  }, [orders]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredOrders.length);
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Generate numbered pagination items with smart ellipsis
  const paginationRange = useMemo(() => {
    const total = totalPages;
    const current = currentPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 4) {
      return [1, 2, 3, 4, 5, "...", total];
    }

    if (current >= total - 3) {
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, "...", current - 1, current, current + 1, "...", total];
  }, [totalPages, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    if (tableTopRef.current) {
      tableTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      handlePageChange(p);
      setJumpPageInput("");
    }
  };

  const filterTabs = [
    { key: "ALL", label: "All Records", count: stats.totalCount, color: "blue" },
    { key: "COMPLETED", label: "Completed", count: stats.completedCount, color: "green" },
    { key: "CANCELLED", label: "Cancelled", count: stats.cancelledCount, color: "red" },
  ];

  // Date-wise Excel (.xlsx) Download Execution
  const handleExecuteDateWiseExcel = async () => {
    try {
      setExporting(true);

      // Fetch all matching orders for the chosen date range and status from backend
      let exportUrl = `/api/admin/orders?history=true&status=${exportStatus}&_t=${Date.now()}`;
      if (exportStartDate) exportUrl += `&startDate=${encodeURIComponent(exportStartDate)}`;
      if (exportEndDate) exportUrl += `&endDate=${encodeURIComponent(exportEndDate)}`;

      const res = await fetch(exportUrl);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch orders for export");
      }

      const ordersToExport: any[] = data.orders || [];

      if (ordersToExport.length === 0) {
        alert(
          `No order records found for ${
            exportStartDate
              ? exportStartDate === exportEndDate
                ? `Date: ${exportStartDate}`
                : `Range: ${exportStartDate} to ${exportEndDate || "today"}`
              : "the selected criteria"
          }.`
        );
        return;
      }

      const rows = ordersToExport.map((o, idx) => {
        const dishes = (o.items || [])
          .map((i: any) => `${i.productName} x${i.quantity}`)
          .join(", ");
        const isPaid = o.bill?.paymentStatus === "PAID" || o.status === "COMPLETED";

        return {
          "S.No": idx + 1,
          "Order ID": o.orderNumber,
          "Date": new Date(o.createdAt).toLocaleDateString("en-IN"),
          "Time": new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          "Table": o.table?.tableNumber || `Table ${o.tableId}`,
          "Customer Name": o.customerName || "-",
          "Mobile Number": o.customerPhone || "-",
          "Party Size": o.guestCount || 1,
          "Dishes": dishes,
          "Subtotal (₹)": Number((o.subtotal || 0).toFixed(2)),
          "Tax (₹)": Number((o.taxAmount || 0).toFixed(2)),
          "Total Amount (₹)": Number((o.totalAmount || 0).toFixed(2)),
          "Payment Status": isPaid ? "PAID" : "PENDING",
          "Payment Mode": o.bill?.paymentMethod || (isPaid ? "UPI/CASH" : "-"),
          "Order Status": o.status,
          "Session Code": o.session?.sessionCode || "-",
        };
      });

      // Calculate totals for footer summary row
      const totalSubtotal = rows.reduce((sum, r) => sum + r["Subtotal (₹)"], 0);
      const totalTax = rows.reduce((sum, r) => sum + r["Tax (₹)"], 0);
      const totalRevenue = rows.reduce((sum, r) => sum + r["Total Amount (₹)"], 0);

      // Summary Total Row
      rows.push({
        "S.No": "" as any,
        "Order ID": "TOTAL",
        "Date": "",
        "Time": "",
        "Table": "",
        "Customer Name": `${ordersToExport.length} Orders`,
        "Mobile Number": "",
        "Party Size": "" as any,
        "Dishes": "",
        "Subtotal (₹)": Number(totalSubtotal.toFixed(2)),
        "Tax (₹)": Number(totalTax.toFixed(2)),
        "Total Amount (₹)": Number(totalRevenue.toFixed(2)),
        "Payment Status": "",
        "Payment Mode": "",
        "Order Status": "",
        "Session Code": "",
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Set optimal column widths
      worksheet["!cols"] = [
        { wch: 6 },  // S.No
        { wch: 14 }, // Order ID
        { wch: 14 }, // Date
        { wch: 12 }, // Time
        { wch: 12 }, // Table
        { wch: 20 }, // Customer Name
        { wch: 16 }, // Mobile Number
        { wch: 11 }, // Party Size
        { wch: 40 }, // Dishes
        { wch: 14 }, // Subtotal
        { wch: 12 }, // Tax
        { wch: 16 }, // Total Amount
        { wch: 15 }, // Payment Status
        { wch: 15 }, // Payment Mode
        { wch: 15 }, // Order Status
        { wch: 16 }, // Session Code
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Orders History");

      // File name format based on date filter
      let fileDateSuffix = "";
      if (exportStartDate && exportEndDate && exportStartDate === exportEndDate) {
        fileDateSuffix = `_${exportStartDate}`;
      } else if (exportStartDate && exportEndDate) {
        fileDateSuffix = `_${exportStartDate}_to_${exportEndDate}`;
      } else if (exportStartDate) {
        fileDateSuffix = `_from_${exportStartDate}`;
      } else {
        fileDateSuffix = `_all_time_${new Date().toISOString().slice(0, 10)}`;
      }

      const fileName = `Hotel_Annapoorna_Orders_History${fileDateSuffix}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      setShowExportModal(false);
    } catch (err: any) {
      console.error("Failed to generate Excel file:", err);
      alert(err.message || "Failed to export Excel file. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-3" ref={tableTopRef}>
      {/* 1. Header Row: Aesthetic Compact Pill Navigation Capsule + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {/* Aesthetic Rounded Pill Navigation Bar */}
          <nav className="inline-flex items-center p-1 bg-stone-200/50 backdrop-blur-md rounded-full border border-[#DFDAD0] shadow-inner gap-0.5 sm:gap-1">
            {/* Live Orders Link */}
            <Link
              href="/admin/orders"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-stone-600 hover:text-[#12372A] hover:bg-white/90 hover:shadow-xs transition-all duration-200 cursor-pointer group"
              title="View live orders and active tables"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="tracking-tight">Live Orders</span>
            </Link>

            {/* Active History Tab */}
            <div
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-[#12372A] via-[#164333] to-[#12372A] text-white shadow-sm ring-1 ring-[#C9A227]/40 transition-all duration-200"
            >
              <History className="w-3 h-3 text-[#E2B755]" />
              <span className="tracking-tight">Order History</span>
            </div>

            {/* Bills Quick Link */}
            <Link
              href="/admin/bills"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-stone-500 hover:text-[#12372A] hover:bg-white/90 hover:shadow-xs transition-all duration-200 cursor-pointer"
              title="Settled Bills and Invoices"
            >
              <Receipt className="w-3 h-3 text-stone-500" />
              <span>Bills</span>
            </Link>
          </nav>
        </div>

        {/* Action Button: Export Excel */}
        <div className="flex items-center">
          <button
            onClick={handleOpenExportModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#12372A] to-[#1E4D3C] hover:from-[#0e2b21] hover:to-[#173e30] active:scale-95 text-white text-[11px] font-extrabold shadow-xs border border-[#C9A227]/30 transition-all duration-200 cursor-pointer group"
            title="Download date-wise orders as Excel spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#E2B755] group-hover:scale-110 transition-transform" />
            <span className="tracking-tight">Export Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Trending Bento Card-Tabs (All Records / Completed / Cancelled) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
        {/* TAB 1: ALL RECORDS (BLUE) */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("ALL");
            setCurrentPage(1);
          }}
          className={`relative text-left p-3 rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden group ${
            statusFilter === "ALL"
              ? "bg-gradient-to-b from-blue-50/90 via-white to-blue-50/30 border-2 border-blue-500 shadow-md shadow-blue-500/10 ring-4 ring-blue-500/10"
              : "bg-white hover:bg-blue-50/30 border border-[#E5E2D9] hover:border-blue-300 shadow-2xs hover:shadow-xs"
          }`}
        >
          {/* Active Top Glowing Accent Line */}
          {statusFilter === "ALL" && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500" />
          )}

          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                  statusFilter === "ALL"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-blue-50 text-blue-600 border border-blue-200/80 group-hover:bg-blue-100"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  statusFilter === "ALL" ? "text-blue-950" : "text-stone-600"
                }`}
              >
                All Records
              </span>
            </div>

            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border transition-colors ${
                statusFilter === "ALL"
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-blue-50 text-blue-700 border-blue-200/80"
              }`}
            >
              All
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-black tracking-tight leading-none ${
                  statusFilter === "ALL" ? "text-blue-950" : "text-stone-900"
                }`}
              >
                {stats.totalCount}
              </span>
              <span className="text-[11px] font-semibold text-stone-500">orders</span>
            </div>
          </div>
        </button>

        {/* TAB 2: COMPLETED (GREEN) */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("COMPLETED");
            setCurrentPage(1);
          }}
          className={`relative text-left p-3 rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden group ${
            statusFilter === "COMPLETED"
              ? "bg-gradient-to-b from-emerald-50/90 via-white to-emerald-50/30 border-2 border-emerald-500 shadow-md shadow-emerald-500/10 ring-4 ring-emerald-500/10"
              : "bg-white hover:bg-emerald-50/30 border border-[#E5E2D9] hover:border-emerald-300 shadow-2xs hover:shadow-xs"
          }`}
        >
          {/* Active Top Glowing Accent Line */}
          {statusFilter === "COMPLETED" && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
          )}

          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                  statusFilter === "COMPLETED"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-600 border border-emerald-200/80 group-hover:bg-emerald-100"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  statusFilter === "COMPLETED" ? "text-emerald-950" : "text-stone-600"
                }`}
              >
                Completed
              </span>
            </div>

            <span
              className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border transition-colors ${
                statusFilter === "COMPLETED"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200/80"
              }`}
            >
              {currency}{stats.completedRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-black tracking-tight leading-none ${
                  statusFilter === "COMPLETED" ? "text-emerald-950" : "text-stone-900"
                }`}
              >
                {stats.completedCount}
              </span>
              <span className="text-[11px] font-semibold text-stone-500">orders</span>
            </div>
          </div>
        </button>

        {/* TAB 3: VOIDED (RED) */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("CANCELLED");
            setCurrentPage(1);
          }}
          className={`relative text-left p-3 rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden group ${
            statusFilter === "CANCELLED"
              ? "bg-gradient-to-b from-rose-50/90 via-white to-rose-50/30 border-2 border-rose-500 shadow-md shadow-rose-500/10 ring-4 ring-rose-500/10"
              : "bg-white hover:bg-rose-50/30 border border-[#E5E2D9] hover:border-rose-300 shadow-2xs hover:shadow-xs"
          }`}
        >
          {/* Active Top Glowing Accent Line */}
          {statusFilter === "CANCELLED" && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-rose-500" />
          )}

          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                  statusFilter === "CANCELLED"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 text-rose-600 border border-rose-200/80 group-hover:bg-rose-100"
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
              </div>
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  statusFilter === "CANCELLED" ? "text-rose-950" : "text-stone-600"
                }`}
              >
                Cancelled
              </span>
            </div>

            <span
              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border transition-colors ${
                statusFilter === "CANCELLED"
                  ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                  : "bg-rose-50 text-rose-700 border-rose-200/80"
              }`}
            >
              Cancelled
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-black tracking-tight leading-none ${
                  statusFilter === "CANCELLED" ? "text-rose-950" : "text-stone-900"
                }`}
              >
                {stats.cancelledCount}
              </span>
              <span className="text-[11px] font-semibold text-stone-500">orders</span>
            </div>
          </div>
        </button>
      </div>

      {/* 3. Streamlined Date & Search Command Bar */}
      <div className="bg-white rounded-2xl p-2.5 border border-[#E5E2D9] shadow-2xs space-y-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Quick Date Presets & Custom Pickers */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[#6B7280] font-bold flex items-center gap-1 shrink-0 mr-1 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-[#12372A]" />
              <span>Date:</span>
            </span>

            {[
              { key: "ALL", label: "All Time" },
              { key: "TODAY", label: "Today" },
              { key: "YESTERDAY", label: "Yesterday" },
              { key: "WEEK", label: "7 Days" },
              { key: "MONTH", label: "Month" },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => handlePresetSelect(p.key as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                  datePreset === p.key
                    ? "bg-[#12372A] text-white shadow-2xs"
                    : "bg-[#FAF9F6] border border-[#E5E2D9] text-[#6B7280] hover:text-[#171717] hover:bg-stone-100"
                }`}
              >
                {p.label}
              </button>
            ))}

            <span className="text-stone-300 hidden sm:inline">|</span>

            {/* Custom Range */}
            <div className="flex items-center gap-1 bg-[#FAF9F6] border border-[#E5E2D9] rounded-lg px-2 py-0.5 text-xs">
              <span className="text-[10px] font-bold text-[#6B7280]">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
                className="bg-transparent text-[11px] font-semibold text-[#171717] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#FAF9F6] border border-[#E5E2D9] rounded-lg px-2 py-0.5 text-xs">
              <span className="text-[10px] font-bold text-[#6B7280]">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                className="bg-transparent text-[11px] font-semibold text-[#171717] focus:outline-none"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={clearDateFilter}
                className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#6B7280] transition cursor-pointer"
                title="Reset date filter"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search order #, table, customer..."
              className="w-full pl-8 pr-7 py-1.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs text-[#171717] placeholder:text-[#6B7280] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#12372A]"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#171717]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Orders Table with Slim Header & Immediate Data Visibility */}
      <div className="bg-white rounded-2xl border border-[#E5E2D9] shadow-2xs overflow-hidden">
        {/* Compact Top Header Bar */}
        <div className="px-3.5 py-2 bg-[#FAF9F6] border-b border-[#E5E2D9] flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B7280]">
          <div className="font-semibold text-[11px] text-[#171717]">
            Showing <strong className="text-[#12372A]">{filteredOrders.length > 0 ? startIndex + 1 : 0}</strong> -{" "}
            <strong className="text-[#12372A]">{endIndex}</strong> of{" "}
            <strong className="text-[#12372A]">{filteredOrders.length}</strong> orders
          </div>

          {/* Rows Per Page Selector & Quick Pagination */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#6B7280]">Rows:</span>
            <div className="flex items-center rounded-lg border border-[#E5E2D9] overflow-hidden bg-white">
              {[25, 50, 100].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setItemsPerPage(size);
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-0.5 text-[11px] font-bold transition cursor-pointer ${
                    itemsPerPage === size
                      ? "bg-[#12372A] text-white"
                      : "text-[#6B7280] hover:bg-stone-100 hover:text-[#171717]"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            <span className="text-[#E5E2D9]">|</span>

            {/* Quick Next/Prev arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1 rounded-lg border border-[#E5E2D9] bg-white disabled:opacity-30 hover:bg-stone-50 transition cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-[11px] font-bold text-[#171717]">
                {currentPage}/{totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1 rounded-lg border border-[#E5E2D9] bg-white disabled:opacity-30 hover:bg-stone-50 transition cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F6] border-b border-[#E5E2D9] text-[#6B7280] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3.5 font-bold">#</th>
                <th className="py-2.5 px-3.5 font-bold">Order ID</th>
                <th className="py-2.5 px-3.5 font-bold">Date & Time</th>
                <th className="py-2.5 px-3.5 font-bold">Table</th>
                <th className="py-2.5 px-3.5 font-bold">Customer</th>
                <th className="py-2.5 px-3.5 font-bold">Dishes</th>
                <th className="py-2.5 px-3.5 font-bold">Amount</th>
                <th className="py-2.5 px-3.5 font-bold">Payment</th>
                <th className="py-2.5 px-3.5 font-bold">Status</th>
                <th className="py-2.5 px-3.5 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map((order, index) => {
                  const isPaid = order.bill?.paymentStatus === "PAID" || order.status === "COMPLETED";
                  const isCancelled = order.status === "CANCELLED";

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-[#F7F5EF] cursor-pointer transition"
                    >
                      <td className="py-2.5 px-3.5 text-[#6B7280] font-semibold text-[11px]">
                        {startIndex + index + 1}
                      </td>

                      <td className="py-2.5 px-3.5 font-extrabold text-[#171717]">
                        #{order.orderNumber}
                      </td>

                      <td className="py-2.5 px-3.5 text-[#6B7280]">
                        <div className="font-semibold text-[#171717]">{new Date(order.createdAt).toLocaleDateString("en-IN")}</div>
                        <div className="text-[10px]">
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 font-bold text-[#12372A]">
                        {order.table?.tableNumber || "Table"}
                      </td>

                      <td className="py-2.5 px-3.5">
                        <div className="font-bold text-[#171717]">
                          {order.customerName}
                        </div>
                        <div className="text-[10px] text-[#6B7280]">
                          {order.customerPhone}
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 text-[#6B7280]">
                        {order.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0} items
                      </td>

                      <td className="py-2.5 px-3.5 font-extrabold text-[#12372A]">
                        {currency}
                        {order.totalAmount.toFixed(2)}
                      </td>

                      <td className="py-2.5 px-3.5">
                        {isCancelled ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600">
                            VOID
                          </span>
                        ) : (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {isPaid ? "PAID" : "PENDING"}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3.5">
                        {order.status === "COMPLETED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            COMPLETED
                          </span>
                        ) : order.status === "CANCELLED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            CANCELLED
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-[#171717]">
                            {order.status}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/bill/${order.id}`}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg border border-[#E5E2D9] hover:bg-stone-100 text-[#171717] transition"
                            title="Print receipt / bill"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#12372A] text-white text-[11px] font-bold cursor-pointer hover:bg-[#0e2b21] transition"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-[#6B7280]">
                    <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-3 text-[#6B7280]">
                      <History className="w-6 h-6" />
                    </div>
                    <div className="font-bold text-[#171717] text-sm">
                      {loading ? "Loading order history..." : "No Historical Orders Found"}
                    </div>
                    <p className="text-xs text-[#6B7280] max-w-xs mx-auto mt-1">
                      {loading
                        ? "Fetching completed and cancelled orders..."
                        : searchQuery
                        ? "No orders match your search query."
                        : startDate || endDate
                        ? `No orders found for the selected date range (${startDate || "start"} to ${endDate || "today"}).`
                        : `No ${statusFilter === "ALL" ? "completed or cancelled" : statusFilter.toLowerCase()} orders found.`}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Complete Bottom Pagination Bar */}
        {filteredOrders.length > 0 && (
          <div className="p-4 bg-[#FAF9F6] border-t border-[#E5E2D9] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
            {/* Showing details */}
            <div className="flex items-center gap-2 font-medium">
              <span>
                Showing <strong className="text-[#171717] font-extrabold">{startIndex + 1}</strong> to{" "}
                <strong className="text-[#171717] font-extrabold">{endIndex}</strong> of{" "}
                <strong className="text-[#171717] font-extrabold">{filteredOrders.length}</strong> orders
              </span>
              <span className="text-stone-300">·</span>
              <span>{itemsPerPage} per page</span>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              {/* First Page */}
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage <= 1}
                className="w-8 h-8 rounded-xl border border-[#E5E2D9] bg-white disabled:opacity-30 hover:bg-stone-50 flex items-center justify-center transition cursor-pointer shadow-2xs"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4 text-[#171717]" />
              </button>

              {/* Prev Page */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-2.5 h-8 rounded-xl border border-[#E5E2D9] bg-white disabled:opacity-30 hover:bg-stone-50 flex items-center justify-center gap-1 font-bold text-xs transition cursor-pointer shadow-2xs"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              {/* Numbered Page Buttons */}
              <div className="flex items-center gap-1">
                {paginationRange.map((page, idx) => {
                  if (page === "...") {
                    return (
                      <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-[#6B7280] font-bold">
                        ...
                      </span>
                    );
                  }

                  const pageNum = Number(page);
                  const isActive = pageNum === currentPage;

                  return (
                    <button
                      key={`page-${pageNum}`}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 rounded-xl text-xs font-black transition cursor-pointer shadow-2xs ${
                        isActive
                          ? "bg-[#12372A] text-white shadow-xs scale-105"
                          : "bg-white border border-[#E5E2D9] text-[#171717] hover:bg-stone-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-2.5 h-8 rounded-xl border border-[#E5E2D9] bg-white disabled:opacity-30 hover:bg-stone-50 flex items-center justify-center gap-1 font-bold text-xs transition cursor-pointer shadow-2xs"
                title="Next Page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Last Page */}
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage >= totalPages}
                className="w-8 h-8 rounded-xl border border-[#E5E2D9] bg-white disabled:opacity-30 hover:bg-stone-50 flex items-center justify-center transition cursor-pointer shadow-2xs"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4 text-[#171717]" />
              </button>
            </div>

            {/* Jump to Page Quick Input */}
            {totalPages > 1 && (
              <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#6B7280]">Go to:</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  placeholder={`${currentPage}`}
                  className="w-12 px-2 py-1 text-xs text-center font-bold bg-white border border-[#E5E2D9] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                />
                <button
                  type="submit"
                  className="px-2 py-1 text-[11px] font-bold rounded-lg bg-[#12372A] text-white hover:bg-[#0e2b21] transition cursor-pointer"
                >
                  Go
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* DATE-WISE EXCEL EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl p-6 border border-[#E5E2D9] shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#E5E2D9] pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#171717] tracking-tight">
                    Date-Wise Excel Export
                  </h3>
                  <p className="text-xs text-[#6B7280]">
                    Select dates and download order ledger as .xlsx
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-[#6B7280] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Date Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#171717] block">
                1. Choose Date Range:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { key: "TODAY", label: "Today" },
                  { key: "YESTERDAY", label: "Yesterday" },
                  { key: "WEEK", label: "Last 7 Days" },
                  { key: "MONTH", label: "This Month" },
                  { key: "ALL", label: "All Time" },
                  { key: "CUSTOM", label: "Custom" },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handleExportPresetSelect(p.key as any)}
                    className={`py-2 px-2.5 rounded-xl font-bold text-center transition cursor-pointer ${
                      exportPreset === p.key
                        ? "bg-[#12372A] text-white shadow-2xs"
                        : "bg-[#FAF9F6] border border-[#E5E2D9] text-[#6B7280] hover:text-[#171717] hover:bg-stone-100"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* From & To Custom Date Inputs */}
            <div className="grid grid-cols-2 gap-3 bg-[#FAF9F6] p-3 rounded-2xl border border-[#E5E2D9]">
              <div>
                <label className="text-[11px] font-bold text-[#6B7280] block mb-1">
                  From Date:
                </label>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => {
                    setExportStartDate(e.target.value);
                    setExportPreset("CUSTOM");
                  }}
                  className="w-full bg-white border border-[#E5E2D9] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#6B7280] block mb-1">
                  To Date:
                </label>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => {
                    setExportEndDate(e.target.value);
                    setExportPreset("CUSTOM");
                  }}
                  className="w-full bg-white border border-[#E5E2D9] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                />
              </div>
            </div>

            {/* Status Filter Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#171717] block">
                2. Order Status:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "ALL", label: "All Records" },
                  { key: "COMPLETED", label: "Completed" },
                  { key: "CANCELLED", label: "Cancelled" },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setExportStatus(s.key as any)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold text-center transition cursor-pointer ${
                      exportStatus === s.key
                        ? "bg-[#12372A] text-white shadow-2xs"
                        : "bg-white border border-[#E5E2D9] text-[#6B7280] hover:bg-stone-50 hover:text-[#171717]"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Export Summary Box */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 text-xs space-y-1">
              <div className="font-bold text-[#12372A] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Ready to Export:</span>
              </div>
              <div className="text-[11px] text-[#6B7280] pl-5.5">
                Dates: <strong className="text-[#171717]">{exportStartDate || "All Time"}</strong> to{" "}
                <strong className="text-[#171717]">{exportEndDate || "Today"}</strong> · Status:{" "}
                <strong className="text-[#171717]">{exportStatus}</strong>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-[#E5E2D9] text-xs font-bold text-[#6B7280] hover:bg-stone-100 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteDateWiseExcel}
                disabled={exporting}
                className="flex-2 py-3 px-4 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-xs font-black text-white shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                    <span>Downloading Excel...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-[#C9A227]" />
                    <span>Download Excel (.xlsx)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over order detail drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onAdvanceStatus={async (orderId, nextStatus) => {
          await fetch("/api/admin/orders", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, status: nextStatus }),
          });
          fetchOrders();
          setSelectedOrder(null);
        }}
      />
    </div>
  );
}
