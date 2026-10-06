"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Star,
  Search,
  MessageSquare,
  Trash2,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Sparkles,
  Check,
} from "lucide-react";

interface FeedbackItem {
  id: number;
  hotelId: number;
  orderId?: number | null;
  orderNumber?: string | null;
  tableNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  rating: number;
  tags?: string | null;
  comment?: string | null;
  createdAt: string;
}

interface FeedbackStats {
  total: number;
  avgRating: string;
  positivePercentage: number;
  distribution: Record<number, number>;
  topTags: Array<{ name: string; count: number }>;
}

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<FeedbackStats>({
    total: 0,
    avgRating: "5.0",
    positivePercentage: 100,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    topTags: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // View mode: Grid or Table
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  const fetchFeedback = async () => {
    try {
      const res = await fetch("/api/feedback");
      const data = await res.json();
      if (res.ok && data.feedbacks) {
        setFeedbacks(data.feedbacks);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to load feedbacks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this customer review?")) return;
    try {
      setDeletingId(id);
      const res = await fetch(`/api/feedback?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFeedbacks((prev) => prev.filter((f) => f.id !== id));
        fetchFeedback();
      }
    } catch (err) {
      console.error("Failed to delete feedback:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter feedbacks
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((f) => {
      // Star filter
      if (ratingFilter !== "all") {
        if (ratingFilter === "low") {
          if (f.rating > 2) return false;
        } else if (f.rating !== Number(ratingFilter)) {
          return false;
        }
      }

      // Search query filter (Order, Table, Name, Phone, Comment, Tags)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = f.customerName?.toLowerCase().includes(q);
        const matchesPhone = f.customerPhone?.toLowerCase().includes(q);
        const matchesOrder = f.orderNumber?.toLowerCase().includes(q);
        const matchesTable = f.tableNumber?.toLowerCase().includes(q);
        const matchesComment = f.comment?.toLowerCase().includes(q);
        const matchesTags = f.tags?.toLowerCase().includes(q);
        return (
          matchesName ||
          matchesPhone ||
          matchesOrder ||
          matchesTable ||
          matchesComment ||
          matchesTags
        );
      }

      return true;
    });
  }, [feedbacks, ratingFilter, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [ratingFilter, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredFeedbacks.length / pageSize) || 1;
  const paginatedFeedbacks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFeedbacks.slice(start, start + pageSize);
  }, [filteredFeedbacks, currentPage, pageSize]);

  return (
    <div className="space-y-6 w-full pb-24">
      {/* 1. Header */}
      <div className="border-b border-[#E5E2D9] pb-4">
        <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
          Feedback
        </h1>
      </div>

      {/* 2. Topline: Total Reviews (Count only) & Review Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 w-full">
        {/* Card 1: Total Reviews (Only count, clean & attractive) */}
        <div className="md:col-span-4 bg-white rounded-2xl p-3 sm:px-4.5 border border-[#E5E2D9] shadow-2xs flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#6B7280] block">
              Total Reviews
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
                {stats.total}
              </span>
              <span className="text-xs font-semibold text-[#6B7280]">
                {stats.total === 1 ? "Review" : "Reviews"}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9] flex items-center justify-center text-[#12372A] shrink-0">
            <MessageSquare className="w-5 h-5 text-[#12372A]" />
          </div>
        </div>

        {/* Card 2: Review Breakdown (Compact 5-star interactive filter buttons) */}
        <div className="md:col-span-8 bg-white rounded-2xl p-3 sm:px-4.5 border border-[#E5E2D9] shadow-2xs flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between text-xs px-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#6B7280]">
              Review Breakdown
            </span>
            {ratingFilter !== "all" && (
              <button
                type="button"
                onClick={() => setRatingFilter("all")}
                className="text-[10px] font-bold text-[#12372A] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Filtered: {ratingFilter}★</span>
                <span className="text-rose-500 font-black">✕ Reset</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = stats.distribution[stars] || 0;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              const isSelected = ratingFilter === String(stars);

              return (
                <button
                  key={stars}
                  type="button"
                  onClick={() => setRatingFilter(isSelected ? "all" : String(stars))}
                  title={`Filter by ${stars} stars`}
                  className={`py-1 px-1 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                    isSelected
                      ? "border-[#12372A] bg-[#12372A] text-white shadow-2xs"
                      : "border-[#E5E2D9] hover:border-stone-400 bg-[#FAF9F6] hover:bg-stone-100 text-[#171717]"
                  }`}
                >
                  <div className="flex items-center gap-0.5 text-[11px] font-black">
                    <span>{stars}</span>
                    <Star
                      className={`w-2.5 h-2.5 ${
                        isSelected ? "fill-[#C9A227] text-[#C9A227]" : "fill-amber-500 text-amber-500"
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-extrabold mt-0.5">
                    <span>{count}</span>
                    <span className={`text-[9px] font-normal ${isSelected ? "text-stone-300" : "text-[#6B7280]"}`}>
                      ({pct}%)
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Search Bar & View Mode Switcher */}
      <div className="bg-white p-3 rounded-2xl border border-[#E5E2D9] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guest name, phone, order number, table or comments..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-[#171717] focus:outline-none focus:border-[#12372A] focus:bg-white transition"
          />
        </div>

        {/* View Mode Toggle + Review Count */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <span className="text-xs font-bold text-[#6B7280]">
            {filteredFeedbacks.length} {filteredFeedbacks.length === 1 ? "review" : "reviews"}
          </span>

          <div className="flex items-center gap-1 bg-[#FAF9F6] p-1 rounded-xl border border-[#E5E2D9]">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 px-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === "grid"
                  ? "bg-[#12372A] text-white shadow-2xs"
                  : "text-[#6B7280] hover:text-[#171717]"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 px-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === "table"
                  ? "bg-[#12372A] text-white shadow-2xs"
                  : "text-[#6B7280] hover:text-[#171717]"
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Feedback Reviews Content */}
      <div className="space-y-4">

        {loading ? (
          <div className="p-12 text-center text-xs text-[#6B7280]">
            Loading customer feedback...
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#E5E2D9] space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 mx-auto flex items-center justify-center text-2xl text-stone-400">
              💬
            </div>
            <h4 className="text-sm font-black text-[#171717]">No Reviews Found</h4>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
              {searchQuery || ratingFilter !== "all"
                ? "No customer reviews match your active filter criteria."
                : "Customer feedback will appear here as soon as guests rate their meals."}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          /* ========================================================================= */
          /* GRID VIEW */
          /* ========================================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedFeedbacks.map((fb) => {
              const formattedDate = new Date(fb.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={fb.id}
                  className="bg-white p-5 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-3.5 flex flex-col justify-between hover:border-[#12372A]/30 transition"
                >
                  <div className="space-y-3">
                    {/* Top Row: Stars + Date + Delete */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= fb.rating
                                  ? "fill-[#C9A227] text-[#C9A227]"
                                  : "text-stone-200"
                              }`}
                            />
                          ))}
                          <span className="text-xs font-black text-[#171717] ml-1.5">
                            {fb.rating}.0
                          </span>
                        </div>
                        <div className="text-[10px] text-[#6B7280] mt-0.5">
                          {formattedDate}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(fb.id)}
                        disabled={deletingId === fb.id}
                        className="text-stone-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="Delete review"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Customer Info (Name & Phone) */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 p-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9]/80 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-[#171717]">
                        <User className="w-3.5 h-3.5 text-stone-400" />
                        <span>{fb.customerName || "Guest Diner"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[#6B7280]">
                        <Phone className="w-3 h-3 text-stone-400" />
                        <span>{fb.customerPhone || "—"}</span>
                      </div>
                    </div>

                    {/* Customer Comment */}
                    {fb.comment && (
                      <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9] text-xs text-[#171717] italic leading-relaxed">
                        &ldquo;{fb.comment}&rdquo;
                      </div>
                    )}

                    {/* Tags */}
                    {fb.tags && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {fb.tags.split(",").map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold"
                          >
                            ✓ {t.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Badges: Table & Order */}
                  <div className="pt-2.5 border-t border-stone-100 flex items-center gap-2 text-xs">
                    {fb.tableNumber && (
                      <span className="font-extrabold text-[#12372A] bg-[#12372A]/5 px-2.5 py-0.5 rounded-md text-[11px]">
                        {fb.tableNumber}
                      </span>
                    )}
                    {fb.orderNumber && (
                      <span className="font-mono text-stone-500 text-[11px]">
                        #{fb.orderNumber}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ========================================================================= */
          /* TABLE VIEW */
          /* ========================================================================= */
          <div className="bg-white rounded-3xl border border-[#E5E2D9] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9F6] border-b border-[#E5E2D9] text-[#6B7280] font-black uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Table / Order</th>
                    <th className="py-3.5 px-4">Rating</th>
                    <th className="py-3.5 px-4">Feedback</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2D9]">
                  {paginatedFeedbacks.map((fb) => {
                    const formattedDate = new Date(fb.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr key={fb.id} className="hover:bg-[#FAF9F6]/80 transition">
                        {/* Customer Column */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#171717]">
                            {fb.customerName || "Guest Diner"}
                          </div>
                          <div className="font-mono text-[11px] text-[#6B7280]">
                            {fb.customerPhone || "—"}
                          </div>
                        </td>

                        {/* Table / Order Column */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {fb.tableNumber && (
                            <span className="font-extrabold text-[#12372A] bg-[#12372A]/5 px-2 py-0.5 rounded-md text-[10px] mr-1.5">
                              {fb.tableNumber}
                            </span>
                          )}
                          {fb.orderNumber && (
                            <span className="font-mono text-stone-500 text-[10px]">
                              #{fb.orderNumber}
                            </span>
                          )}
                        </td>

                        {/* Rating Column */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 font-bold text-[#171717]">
                            <Star className="w-3.5 h-3.5 fill-[#C9A227] text-[#C9A227]" />
                            <span>{fb.rating}.0</span>
                          </div>
                        </td>

                        {/* Feedback & Tags Column */}
                        <td className="py-3.5 px-4 max-w-md">
                          {fb.comment && (
                            <p className="text-xs text-[#171717] italic line-clamp-2 mb-1">
                              &ldquo;{fb.comment}&rdquo;
                            </p>
                          )}
                          {fb.tags && (
                            <div className="flex flex-wrap gap-1">
                              {fb.tags.split(",").map((t, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[9px] font-bold"
                                >
                                  ✓ {t.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Date Column */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-[#6B7280]">
                          {formattedDate}
                        </td>

                        {/* Action Column */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(fb.id)}
                            disabled={deletingId === fb.id}
                            className="text-stone-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            title="Delete review"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. PAGINATION CONTROLS (Always visible when reviews exist) */}
        {/* ========================================================================= */}
        {filteredFeedbacks.length > 0 && (
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E5E2D9] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs mt-4">
            {/* Left: Summary & Per-page selector */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[#6B7280] font-medium">
                Showing <strong className="text-[#171717]">{(currentPage - 1) * pageSize + 1}</strong> to{" "}
                <strong className="text-[#171717]">{Math.min(currentPage * pageSize, filteredFeedbacks.length)}</strong> of{" "}
                <strong className="text-[#171717]">{filteredFeedbacks.length}</strong> reviews
              </span>

              {/* Rows per page selector */}
              <div className="flex items-center gap-1.5 pl-2 sm:border-l border-stone-200">
                <span className="text-[11px] text-[#6B7280] font-semibold">Per page:</span>
                {[50, 100, 200, 500].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                      pageSize === size
                        ? "bg-[#12372A] text-white shadow-2xs"
                        : "bg-[#FAF9F6] border border-[#E5E2D9] text-[#6B7280] hover:bg-stone-100 hover:text-[#171717]"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Previous, Page Numbers, Next */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded-xl border border-[#E5E2D9] bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  const isActive = currentPage === pageNum;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center ${
                        isActive
                          ? "bg-[#12372A] text-white shadow-xs"
                          : "bg-white border border-[#E5E2D9] text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-xl border border-[#E5E2D9] bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs text-xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
