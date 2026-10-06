"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  RefreshCw,
  ArrowRight,
  FileSpreadsheet,
  X,
  Copy,
  Check,
  Clock,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from "lucide-react";
import * as XLSX from "xlsx";
import CustomerDetailDrawer from "@/components/admin/CustomerDetailDrawer";

export default function CustomersManagementPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // View mode: Grid (Cards) or Table (Spreadsheet)
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");

  // Pagination state (selectable: 5, 10, 25, 50)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const currency = "₹";

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/customers");
      const data = await res.json();
      if (res.ok) {
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Reset page when search changes to prevent getting stuck on empty page
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Filter across all customers by search query
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  // Copy phone handler
  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // Export directly as genuine Excel (.xlsx) file
  const handleExportExcel = () => {
    if (customers.length === 0) return;

    const rows = customers.map((c, index) => ({
      "S.No": index + 1,
      "Customer Name": c.name,
      "Phone Number": c.phone,
      "Shop Visits Count": c.ordersCount,
      "Total Spent Amount (₹)": Number(c.totalSpent.toFixed(2)),
      "Last Visit Date": new Date(c.lastOrderDate).toLocaleDateString([], {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Set nice column widths for Excel
    worksheet["!cols"] = [
      { wch: 8 },  // S.No
      { wch: 25 }, // Customer Name
      { wch: 18 }, // Phone Number
      { wch: 18 }, // Shop Visits Count
      { wch: 22 }, // Total Spent Amount
      { wch: 18 }, // Last Visit Date
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Hotel_Annapoorna_Customers_${today}.xlsx`);
  };

  return (
    <div className="space-y-4 w-full pb-20">
      {/* ── 1. Top Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E2D9]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#12372A] to-[#1E4D3C] text-[#E2B755] flex items-center justify-center shadow-xs border border-[#C9A227]/30">
              <Users className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight">
              Customer Directory
            </h1>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
              {customers.length} Customers
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1 font-medium">
            View restaurant customers, visit frequency and lifetime spending
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export to Excel (.xlsx) Button */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-[#E5E2D9] text-xs font-black shadow-2xs transition cursor-pointer active:scale-95"
            title="Download Customer List as Excel spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Excel (.xlsx)</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchCustomers}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-[#E5E2D9] hover:bg-stone-50 text-[#12372A] shadow-2xs transition cursor-pointer"
            title="Refresh customers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Top Summary Card: Only Total Count ── */}
      <div className="bg-white rounded-2xl p-4 border border-[#E5E2D9] shadow-2xs flex items-center justify-between max-w-sm">
        <div>
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
            Total Customers
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-2xl font-black text-stone-900 leading-none">
              {customers.length}
            </span>
            <span className="text-xs text-stone-500 font-medium">registered diners</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#12372A] to-[#1E4D3C] text-[#E2B755] border border-[#C9A227]/30 flex items-center justify-center shadow-xs">
          <Users className="w-5 h-5" />
        </div>
      </div>

      {/* ── 3. Search & View Mode Controls Bar ── */}
      <div className="bg-white rounded-2xl p-3 border border-[#E5E2D9] shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search input across all customers */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer by name or phone number..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-[#171717] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#12372A]/30 focus:border-[#12372A] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Layout Switcher: Cards Grid vs Table View */}
        <div className="inline-flex items-center p-0.5 bg-[#FAF9F6] rounded-xl border border-[#E5E2D9]">
          <button
            onClick={() => setViewMode("GRID")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === "GRID"
                ? "bg-[#12372A] text-white shadow-2xs font-black"
                : "text-stone-500 hover:text-stone-900"
            }`}
            title="Grid View (Cards)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
          <button
            onClick={() => setViewMode("TABLE")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === "TABLE"
                ? "bg-[#12372A] text-white shadow-2xs font-black"
                : "text-stone-500 hover:text-stone-900"
            }`}
            title="Table View (Spreadsheet)"
          >
            <List className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* ── 4. Main Content: Grid or Table ── */}
      {loading && customers.length === 0 ? (
        <div className="flex items-center justify-center py-16 bg-white rounded-3xl border border-[#E5E2D9]">
          <div className="text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#12372A]" />
            <p className="text-xs text-[#6B7280] font-bold">Loading customers...</p>
          </div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#E5E2D9] text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 text-stone-500 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-[#171717]">No Customers Found</h3>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
            No customer matches &quot;{searchQuery}&quot;. Try typing a different name or number.
          </p>
          {searchQuery && (
            <div className="pt-1">
              <button
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 rounded-xl bg-stone-100 text-stone-800 text-xs font-bold hover:bg-stone-200 transition cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      ) : viewMode === "GRID" ? (
        /* BENTO CARDS GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedCustomers.map((c) => (
            <div
              key={c.phone}
              onClick={() => setSelectedCustomer(c)}
              className="group/card bg-white rounded-3xl p-4 sm:p-5 border border-[#E5E2D9] shadow-2xs hover:shadow-lg hover:border-[#12372A]/30 transition-all duration-300 flex flex-col justify-between cursor-pointer hover:-translate-y-0.5"
            >
              <div>
                {/* Customer Avatar & Name */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#12372A] to-[#1E4D3C] text-[#E2B755] font-black text-sm flex items-center justify-center shrink-0 border border-[#C9A227]/30 shadow-xs group-hover/card:scale-105 transition-transform">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-sm sm:text-base text-[#171717] tracking-tight truncate group-hover/card:text-[#12372A] transition-colors">
                      {c.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 text-stone-500 text-xs">
                      <span className="font-mono">{c.phone}</span>
                      <button
                        onClick={(e) => handleCopyPhone(c.phone, e)}
                        className="p-0.5 hover:text-stone-900 transition"
                        title="Copy phone"
                      >
                        {copiedPhone === c.phone ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 text-stone-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2-Column Stats Box: Total Spent & Shop Visits */}
                <div className="mt-4 grid grid-cols-2 gap-2 p-2.5 bg-[#FAF9F6] rounded-2xl border border-[#E5E2D9]/70 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">
                      Total Spent
                    </span>
                    <span className="text-sm font-black text-[#12372A] block mt-0.5">
                      {currency}
                      {c.totalSpent.toFixed(0)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">
                      Shop Visits
                    </span>
                    <span className="text-sm font-black text-stone-900 block mt-0.5">
                      {c.ordersCount} {c.ordersCount === 1 ? "time" : "times"}
                    </span>
                  </div>
                </div>

                {/* Last Visit Date */}
                <div className="flex items-center justify-between text-[11px] text-stone-500 mt-3 pt-2.5 border-t border-[#E5E2D9]/70">
                  <span className="text-stone-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>Last Visit</span>
                  </span>
                  <span className="font-bold text-stone-800">
                    {new Date(c.lastOrderDate).toLocaleDateString([], {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Card Footer: View Dining History */}
              <div className="mt-4 pt-3 border-t border-[#E5E2D9]/70 flex items-center justify-between text-xs font-bold text-[#12372A] group-hover/card:text-[#0e2b21]">
                <span>View Orders History</span>
                <div className="w-6 h-6 rounded-lg bg-stone-100 group-hover/card:bg-[#12372A] group-hover/card:text-[#E2B755] flex items-center justify-center transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* SPREADSHEET TABLE VIEW */
        <div className="bg-white rounded-2xl border border-[#E5E2D9] overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#E5E2D9] text-[10px] font-black uppercase text-stone-500 tracking-wider">
                  <th className="py-3 px-4 w-14 text-center">#</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4 w-40">Phone Number</th>
                  <th className="py-3 px-4 w-32 text-center">Shop Visits</th>
                  <th className="py-3 px-4 w-36">Total Spent Amount</th>
                  <th className="py-3 px-4 w-36">Last Visit Date</th>
                  <th className="py-3 px-4 w-28 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2D9]/70">
                {paginatedCustomers.map((c, idx) => (
                  <tr
                    key={c.phone}
                    onClick={() => setSelectedCustomer(c)}
                    className="hover:bg-stone-50/80 transition-colors cursor-pointer"
                  >
                    {/* Index */}
                    <td className="py-3 px-4 text-center font-bold text-stone-400">
                      {startIndex + idx + 1}
                    </td>

                    {/* Customer Name + Avatar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#12372A] to-[#1E4D3C] text-[#E2B755] font-black text-xs flex items-center justify-center shrink-0 border border-[#C9A227]/30 shadow-xs">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-black text-stone-900">{c.name}</span>
                      </div>
                    </td>

                    {/* Phone Number */}
                    <td className="py-3 px-4 font-mono text-stone-600">
                      <div className="flex items-center gap-1.5">
                        <span>{c.phone}</span>
                        <button
                          onClick={(e) => handleCopyPhone(c.phone, e)}
                          className="p-1 hover:text-stone-900 transition"
                          title="Copy phone"
                        >
                          {copiedPhone === c.phone ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-stone-400" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Shop Visits Count */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-stone-100 text-stone-800 border border-stone-200">
                        {c.ordersCount} {c.ordersCount === 1 ? "time" : "times"}
                      </span>
                    </td>

                    {/* Total Spent Amount */}
                    <td className="py-3 px-4 font-black text-sm text-[#12372A]">
                      {currency}
                      {c.totalSpent.toFixed(2)}
                    </td>

                    {/* Last Visit Date */}
                    <td className="py-3 px-4 text-stone-600 font-medium">
                      {new Date(c.lastOrderDate).toLocaleDateString([], {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(c);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#12372A] to-[#1E4D3C] hover:from-[#0e2b21] hover:to-[#173e30] text-white text-[11px] font-black transition cursor-pointer shadow-2xs border border-[#C9A227]/30"
                      >
                        Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. Pagination Bar ── */}
      {filteredCustomers.length > 0 && (
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#E5E2D9] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Summary & Rows Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-stone-600 font-medium">
              Showing <span className="font-black text-stone-900">{startIndex + 1}</span> to{" "}
              <span className="font-black text-stone-900">
                {Math.min(startIndex + itemsPerPage, filteredCustomers.length)}
              </span>{" "}
              of <span className="font-black text-[#12372A]">{filteredCustomers.length}</span> customers
            </span>

            <div className="flex items-center gap-1.5 pl-2 border-l border-[#E5E2D9]">
              <span className="text-[11px] font-bold text-[#6B7280]">Rows:</span>
              <div className="flex items-center rounded-lg border border-[#E5E2D9] overflow-hidden bg-white shadow-2xs">
                {[5, 10, 25, 50].map((size) => (
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

          {/* Right: Direct Page Chooser & Numbered Controls */}
          <div className="flex items-center gap-2 flex-wrap">
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

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 self-center sm:self-auto">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E5E2D9] text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-xs font-black transition cursor-pointer ${
                        currentPage === page
                          ? "bg-[#12372A] text-white shadow-xs border border-[#C9A227]/30"
                          : "bg-white text-stone-700 border border-[#E5E2D9] hover:bg-stone-100"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E5E2D9] text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Detail Drawer */}
      <CustomerDetailDrawer
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        currency={currency}
      />
    </div>
  );
}
