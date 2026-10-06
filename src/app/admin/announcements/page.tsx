"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
  Filter,
  Search,
  LayoutGrid,
  List,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  Copy,
  Tag,
  Link2,
} from "lucide-react";
import { AnnouncementData } from "@/types";
import AnnouncementSlideshow from "@/components/AnnouncementSlideshow";

// Popular emojis for food, deals & celebrations
const POPULAR_EMOJIS = [
  "🔥", "✨", "🎉", "🍛", "🥘", "🍲", "🍹", "☕",
  "⭐", "🏷️", "💥", "🎁", "🤤", "🥗", "🍰", "👑",
  "🔔", "🍕", "🍨", "🌮", "🥟", "🌶️", "💯", "💎"
];

// Preset badge tags
const PRESET_BADGES = [
  "TODAY SPECIAL",
  "HOT OFFER",
  "CHEF'S PICK",
  "WEEKEND DEAL",
  "FRESH ARRIVAL",
  "50% OFF",
  "LIMITED TIME",
  "SIGNATURE DISH",
  "ANNOUNCEMENT",
];

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hotelId, setHotelId] = useState<string>("");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");

  // Clipboard copy state
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnouncementData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [text, setText] = useState("");
  const [badge, setBadge] = useState("TODAY SPECIAL");
  const [linkUrl, setLinkUrl] = useState("/menu");
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Fetch announcements
  const loadAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch("/api/admin/announcements");
      const data = await res.json();
      if (res.ok) {
        setAnnouncements(data.announcements || []);
        if (data.hotelId) setHotelId(data.hotelId);
      } else {
        setErrorMessage(data.error || "Failed to load announcements");
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage("Network error loading announcements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  // Master sorted list by sortOrder
  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [announcements]);

  // Active items for live customer slideshow
  const activeAnnouncements = useMemo(() => {
    return sortedAnnouncements.filter((a) => a.isActive);
  }, [sortedAnnouncements]);

  // Filtered list based on search and status
  const filteredAnnouncements = useMemo(() => {
    return sortedAnnouncements.filter((item) => {
      if (statusFilter === "ACTIVE" && !item.isActive) return false;
      if (statusFilter === "INACTIVE" && item.isActive) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = item.text?.toLowerCase().includes(q);
        const matchesBadge = item.badge?.toLowerCase().includes(q);
        const matchesLink = item.linkUrl?.toLowerCase().includes(q);
        return matchesText || matchesBadge || matchesLink;
      }
      return true;
    });
  }, [sortedAnnouncements, statusFilter, searchQuery]);

  // Stats
  const activeCount = activeAnnouncements.length;
  const hiddenCount = announcements.length - activeCount;
  const featuredCount = announcements.filter(
    (a) => a.badge && ["HOT OFFER", "TODAY SPECIAL", "CHEF'S PICK", "50% OFF"].includes(a.badge)
  ).length;

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    setText("");
    setBadge("TODAY SPECIAL");
    setLinkUrl("/menu");
    setSortOrder(
      announcements.length > 0 ? Math.max(...announcements.map((a) => a.sortOrder)) + 1 : 1
    );
    setIsActive(true);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item: AnnouncementData) => {
    setEditingItem(item);
    setText(item.text);
    setBadge(item.badge || "TODAY SPECIAL");
    setLinkUrl(item.linkUrl || "");
    setSortOrder(item.sortOrder);
    setIsActive(item.isActive);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  // Quick emoji insertion
  const insertEmoji = (emoji: string) => {
    setText((prev) => (prev ? prev + " " + emoji : emoji));
  };

  // Save Announcement
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setErrorMessage("Please enter announcement text");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      if (editingItem) {
        const res = await fetch("/api/admin/announcements", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingItem.id,
            text,
            badge,
            theme: "emerald",
            linkUrl: linkUrl.trim() || null,
            sortOrder: Number(sortOrder) || 1,
            isActive,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update announcement");
      } else {
        const res = await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hotelId,
            text,
            badge,
            theme: "emerald",
            linkUrl: linkUrl.trim() || null,
            sortOrder: Number(sortOrder) || 1,
            isActive,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create announcement");
      }

      setIsModalOpen(false);
      await loadAnnouncements();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving announcement";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active state with optimistic update
  const handleToggleActive = async (item: AnnouncementData) => {
    const nextState = !item.isActive;
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, isActive: nextState } : a))
    );

    try {
      const res = await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isActive: nextState }),
      });
      if (!res.ok) {
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === item.id ? { ...a, isActive: item.isActive } : a))
        );
      }
    } catch {
      loadAnnouncements();
    }
  };

  // Reorder Announcement position (Up / Down)
  const handleMove = async (item: AnnouncementData, direction: "up" | "down") => {
    const idx = sortedAnnouncements.findIndex((a) => a.id === item.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sortedAnnouncements.length) return;
    const other = sortedAnnouncements[swapIdx];

    try {
      setAnnouncements((prev) =>
        prev
          .map((a) => {
            if (a.id === item.id) return { ...a, sortOrder: other.sortOrder };
            if (a.id === other.id) return { ...a, sortOrder: item.sortOrder };
            return a;
          })
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );

      await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reorder: [
            { id: item.id, sortOrder: other.sortOrder },
            { id: other.id, sortOrder: item.sortOrder },
          ],
        }),
      });
    } catch {
      loadAnnouncements();
    }
  };

  // Delete Announcement
  const handleDelete = async (item: AnnouncementData) => {
    if (!window.confirm(`Are you sure you want to delete this banner?\n\n"${item.text.slice(0, 60)}..."`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/announcements?id=${item.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== item.id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete banner");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Copy text to clipboard
  const handleCopyText = (item: AnnouncementData) => {
    navigator.clipboard.writeText(item.text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4 w-full pb-20">
      {/* ── 1. Top Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E2D9]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#12372A] to-[#1E4D3C] text-[#E2B755] flex items-center justify-center shadow-xs border border-[#C9A227]/30">
              <Megaphone className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight">
              Slideshow Banners
            </h1>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
              {announcements.length} Banners
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1 font-medium">
            Manage rolling offer banners, chef specials & highlight tickers displayed above the menu
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick link to customer menu */}
          <Link
            href="/menu"
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-[#E5E2D9] text-xs font-bold shadow-2xs transition cursor-pointer"
            title="Open customer menu page in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>Customer Menu</span>
          </Link>

          {/* Add Banner Button */}
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#12372A] to-[#1E4D3C] hover:from-[#0e2b21] hover:to-[#173e30] active:scale-95 text-white text-xs font-black shadow-xs border border-[#C9A227]/30 transition cursor-pointer group"
          >
            <Plus className="w-4 h-4 text-[#E2B755] group-hover:scale-110 transition-transform" />
            <span>+ Add Banner</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadAnnouncements}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-[#E5E2D9] hover:bg-stone-50 text-[#12372A] shadow-2xs transition cursor-pointer"
            title="Refresh banners"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Bento KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-2xl p-3 border border-[#E5E2D9] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Total Banners
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-stone-900 leading-none">
                {announcements.length}
              </span>
              <span className="text-[10px] text-stone-500 font-medium">configured</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
            <Megaphone className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-[#E5E2D9] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Active in Slideshow
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-emerald-800 leading-none">
                {activeCount}
              </span>
              <span className="text-[10px] text-emerald-700 font-medium">live ticker</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
            <Eye className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-[#E5E2D9] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Paused / Hidden
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-stone-700 leading-none">
                {hiddenCount}
              </span>
              <span className="text-[10px] text-stone-500 font-medium">drafts</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-600 border border-stone-200 flex items-center justify-center">
            <EyeOff className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-[#E5E2D9] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Featured Specials
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-amber-700 leading-none">
                {featuredCount}
              </span>
              <span className="text-[10px] text-amber-600 font-medium">tagged offers</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>

      {/* ── 3. Live Customer View Preview ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E5E2D9] shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Eye className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-[#171717] uppercase tracking-wider">
                Live Customer Slideshow Preview
              </h2>
              <span className="text-[11px] text-[#6B7280]">
                Rolling ticker shown right above the search bar on customer menu
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{activeCount} Active on Menu</span>
            </span>
          </div>
        </div>

        {/* Slideshow frame */}
        <div className="p-3 sm:p-4 bg-gradient-to-b from-[#FAF9F6] to-stone-100/70 border border-[#E5E2D9] rounded-2xl">
          {activeAnnouncements.length > 0 ? (
            <AnnouncementSlideshow announcements={activeAnnouncements} />
          ) : (
            <div className="text-center py-7 px-4">
              <Megaphone className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-stone-700">No active banners right now</p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Toggle a banner ON or click &quot;+ Add Banner&quot; to make it appear in the customer slideshow.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Search & Controls Bar ── */}
      <div className="bg-white rounded-2xl p-3 border border-[#E5E2D9] shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search banners by text, badge or link..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-[#171717] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#12372A]/30 focus:border-[#12372A] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Status Pills & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          <div className="inline-flex items-center p-0.5 bg-[#FAF9F6] rounded-xl border border-[#E5E2D9]">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-white text-stone-900 shadow-2xs font-black"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              All ({announcements.length})
            </button>
            <button
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                statusFilter === "ACTIVE"
                  ? "bg-white text-emerald-800 shadow-2xs font-black"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Active ({activeCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter("INACTIVE")}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                statusFilter === "INACTIVE"
                  ? "bg-white text-stone-800 shadow-2xs font-black"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
              <span>Hidden ({hiddenCount})</span>
            </button>
          </div>

          {/* Grid / Table Layout Switcher */}
          <div className="inline-flex items-center p-0.5 bg-[#FAF9F6] rounded-xl border border-[#E5E2D9]">
            <button
              onClick={() => setViewMode("GRID")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                viewMode === "GRID"
                  ? "bg-[#12372A] text-white shadow-2xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
              title="Cards Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode("TABLE")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                viewMode === "TABLE"
                  ? "bg-[#12372A] text-white shadow-2xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
              title="Spreadsheet Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. Main Content: Grid or Table ── */}
      {loading && announcements.length === 0 ? (
        <div className="flex items-center justify-center py-16 bg-white rounded-3xl border border-[#E5E2D9]">
          <div className="text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#12372A]" />
            <p className="text-xs text-[#6B7280] font-bold">Loading slideshow banners...</p>
          </div>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#E5E2D9] text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 text-stone-500 flex items-center justify-center">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-[#171717]">No Banners Found</h3>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
            No banner matches your filter or search query. Create a new banner or reset your filters.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setSearchQuery("");
              }}
              className="px-4 py-2 rounded-xl bg-stone-100 text-stone-800 text-xs font-bold hover:bg-stone-200 transition cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl bg-[#12372A] text-white text-xs font-bold hover:bg-[#0e2b21] transition cursor-pointer"
            >
              + Create Banner
            </button>
          </div>
        </div>
      ) : viewMode === "GRID" ? (
        /* UNIFIED LUXURY CARDS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAnnouncements.map((item) => {
            const isFirst = sortedAnnouncements.findIndex((a) => a.id === item.id) === 0;
            const isLast =
              sortedAnnouncements.findIndex((a) => a.id === item.id) ===
              sortedAnnouncements.length - 1;

            return (
              <div
                key={item.id}
                className={`group/card rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between hover:-translate-y-0.5 ${
                  item.isActive
                    ? "bg-white border border-[#E5E2D9] shadow-xs hover:shadow-lg"
                    : "bg-stone-50/80 border border-dashed border-stone-300 opacity-75 hover:opacity-90"
                }`}
              >
                {/* ── Signature Annapoorna Header Band ── */}
                <div className="relative px-4 py-3 bg-gradient-to-r from-[#0E2B20] via-[#12372A] to-[#0A2118] border-b border-[#C9A227]/30 text-white shadow-inner">
                  <div className="relative flex items-center justify-between gap-2">
                    {/* Left: Sequence + Badge */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-black/40 border border-[#C9A227]/30 text-[#E2B755] flex items-center justify-center text-[10px] font-black shrink-0">
                        #{item.sortOrder}
                      </span>
                      {item.badge ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#C9A227] text-stone-950 shadow-xs truncate">
                          {item.badge}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-white/70">
                          Banner #{item.sortOrder}
                        </span>
                      )}
                    </div>

                    {/* Right: Live / Paused Status Toggle */}
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black transition cursor-pointer select-none shadow-xs ${
                        item.isActive
                          ? "bg-emerald-500 text-white hover:bg-emerald-600"
                          : "bg-black/40 text-stone-300 hover:bg-black/60 border border-white/10"
                      }`}
                      title={item.isActive ? "Click to deactivate" : "Click to activate"}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.isActive ? "bg-white animate-pulse" : "bg-stone-400"
                        }`}
                      />
                      <span>{item.isActive ? "Live" : "Paused"}</span>
                    </button>
                  </div>
                </div>

                {/* ── Card Body ── */}
                <div className="px-4 py-3.5 flex-1 space-y-3">
                  {/* Announcement text with rich emoji support */}
                  <p className="text-xs sm:text-[13px] font-bold text-[#171717] leading-relaxed break-words line-clamp-3 min-h-[3rem]">
                    {item.text}
                  </p>

                  {/* Destination Link Tag */}
                  {item.linkUrl && (
                    <div className="pt-1 border-t border-[#E5E2D9]/60">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md truncate max-w-full">
                        <Link2 className="w-3 h-3 text-[#C9A227] shrink-0" />
                        <span className="truncate">{item.linkUrl}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Card Footer: Reorder Pill + Green Edit + Red Delete ── */}
                <div className="px-3 py-2 bg-[#FAF9F6] border-t border-[#E5E2D9]/70 flex items-center justify-between">
                  {/* Reorder Arrows in Dark Green Pill */}
                  <div className="inline-flex items-center gap-0.5 bg-gradient-to-r from-[#12372A] to-[#1A4535] rounded-lg p-0.5 shadow-2xs">
                    <button
                      onClick={() => handleMove(item, "up")}
                      disabled={isFirst}
                      className={`p-1.5 rounded-md transition ${
                        isFirst
                          ? "text-white/20 cursor-not-allowed"
                          : "text-white/80 hover:text-[#E2B755] hover:bg-white/10 cursor-pointer active:scale-90"
                      }`}
                      title="Move up in slideshow order"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(item, "down")}
                      disabled={isLast}
                      className={`p-1.5 rounded-md transition ${
                        isLast
                          ? "text-white/20 cursor-not-allowed"
                          : "text-white/80 hover:text-[#E2B755] hover:bg-white/10 cursor-pointer active:scale-90"
                      }`}
                      title="Move down in slideshow order"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Actions: Copy + Edit (green) + Delete (red) */}
                  <div className="flex items-center gap-1.5">
                    {/* Copy text button */}
                    <button
                      onClick={() => handleCopyText(item)}
                      className="p-1.5 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900 border border-stone-200 transition cursor-pointer active:scale-90"
                      title={copiedId === item.id ? "Copied!" : "Copy announcement text"}
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Edit button (Emerald green) */}
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 border border-emerald-200 transition cursor-pointer active:scale-90"
                      title="Edit banner"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button (Red) */}
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:text-red-800 transition cursor-pointer active:scale-90"
                      title="Delete banner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* SPREADSHEET TABLE VIEW */
        <div className="bg-white rounded-2xl border border-[#E5E2D9] overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#E5E2D9] text-[10px] font-black uppercase text-stone-500 tracking-wider">
                  <th className="py-3 px-4 w-14 text-center">Seq</th>
                  <th className="py-3 px-4 w-36">Badge Tag</th>
                  <th className="py-3 px-4">Announcement Text</th>
                  <th className="py-3 px-4 w-40">Link Target</th>
                  <th className="py-3 px-4 w-28 text-center">Status</th>
                  <th className="py-3 px-4 w-36 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2D9]/70">
                {filteredAnnouncements.map((item) => {
                  const isFirst = sortedAnnouncements.findIndex((a) => a.id === item.id) === 0;
                  const isLast =
                    sortedAnnouncements.findIndex((a) => a.id === item.id) ===
                    sortedAnnouncements.length - 1;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-stone-50/80 transition-colors ${
                        !item.isActive ? "opacity-60 bg-stone-50/40" : ""
                      }`}
                    >
                      {/* Sequence */}
                      <td className="py-3 px-4 text-center font-black text-stone-700">
                        #{item.sortOrder}
                      </td>

                      {/* Badge Tag */}
                      <td className="py-3 px-4">
                        {item.badge ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#C9A227] text-stone-950">
                            {item.badge}
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400 italic">No badge</span>
                        )}
                      </td>

                      {/* Announcement Text */}
                      <td className="py-3 px-4 font-bold text-[#171717] max-w-md">
                        <p className="line-clamp-2 leading-relaxed">{item.text}</p>
                      </td>

                      {/* Link */}
                      <td className="py-3 px-4 font-mono text-[11px] text-stone-600">
                        {item.linkUrl ? (
                          <span className="inline-flex items-center gap-1 bg-stone-100 px-2 py-0.5 rounded-md">
                            <Link2 className="w-3 h-3 text-[#C9A227]" />
                            <span className="truncate max-w-[120px]">{item.linkUrl}</span>
                          </span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black transition cursor-pointer ${
                            item.isActive
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                              : "bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-300"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.isActive ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
                            }`}
                          />
                          <span>{item.isActive ? "Live" : "Off"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reorder pill */}
                          <div className="inline-flex items-center gap-0.5 bg-gradient-to-r from-[#12372A] to-[#1A4535] rounded-lg p-0.5">
                            <button
                              onClick={() => handleMove(item, "up")}
                              disabled={isFirst}
                              className={`p-1 rounded-md transition ${
                                isFirst
                                  ? "text-white/20 cursor-not-allowed"
                                  : "text-white/80 hover:text-[#E2B755] cursor-pointer"
                              }`}
                              title="Move up"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleMove(item, "down")}
                              disabled={isLast}
                              className={`p-1 rounded-md transition ${
                                isLast
                                  ? "text-white/20 cursor-not-allowed"
                                  : "text-white/80 hover:text-[#E2B755] cursor-pointer"
                              }`}
                              title="Move down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Edit (green) */}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>

                          {/* Delete (red) */}
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 6. Modal: Add / Edit Announcement Banner ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-black/10 space-y-4 animate-in fade-in zoom-in-95 duration-200 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#12372A] to-[#1E4D3C] text-[#E2B755] flex items-center justify-center shadow-xs">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#171717] tracking-tight">
                    {editingItem ? "Edit Slideshow Banner" : "Create New Slideshow Banner"}
                  </h3>
                  <span className="text-[10px] text-[#6B7280]">
                    Customize rolling text & highlight badge
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error banner if any */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2">
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Interactive Live Mini-Preview of Banner */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block">
                Live Banner Preview:
              </span>
              <div className="p-3 rounded-2xl bg-gradient-to-r from-[#0E2B20] via-[#12372A] to-[#0A2118] border border-[#C9A227]/40 shadow-md flex items-center justify-between gap-3 text-white transition-all">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {badge && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#C9A227] text-stone-950 shadow-2xs shrink-0">
                      {badge}
                    </span>
                  )}
                  <span className="text-xs font-bold tracking-tight text-stone-100 truncate">
                    {text || "Your announcement message will appear here..."}
                  </span>
                </div>
                <span className="text-[#C9A227] text-xs font-black shrink-0">✦</span>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Announcement Text with Emoji Toolbar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#171717]">
                    Announcement Message <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {text.length} chars
                  </span>
                </div>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  required
                  placeholder="e.g. 🔥 Weekend Special: Flat 20% OFF on all Signature Biriyanis & Tandoori Starters! 🍛"
                  className="w-full p-3 text-xs sm:text-sm bg-[#FAF9F6] border border-[#E5E2D9] rounded-2xl text-[#171717] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#12372A]/30 focus:border-[#12372A] leading-relaxed"
                />

                {/* Quick Emoji Toolbar */}
                <div className="mt-2 space-y-1">
                  <span className="text-[10px] text-stone-500 font-semibold block">
                    Quick-Insert Emojis:
                  </span>
                  <div className="flex flex-wrap gap-1 p-2 bg-[#FAF9F6] rounded-xl border border-[#E5E2D9] max-h-20 overflow-y-auto">
                    {POPULAR_EMOJIS.map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="w-7 h-7 rounded-lg bg-white border border-[#E5E2D9] hover:bg-stone-100 flex items-center justify-center text-sm transition active:scale-90 cursor-pointer shadow-2xs"
                        title={`Insert ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Badge Tag Selector */}
              <div>
                <label className="text-xs font-bold text-[#171717] block mb-1.5">
                  Highlight Badge Tag
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_BADGES.map((b) => (
                    <button
                      type="button"
                      key={b}
                      onClick={() => setBadge(b)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                        badge === b
                          ? "bg-[#12372A] text-white shadow-2xs"
                          : "bg-[#FAF9F6] hover:bg-stone-200 text-stone-700 border border-[#E5E2D9]"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setBadge("")}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold text-stone-500 hover:text-stone-800 transition cursor-pointer ${
                      !badge ? "underline font-black text-[#12372A]" : ""
                    }`}
                  >
                    None
                  </button>
                </div>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="Or type custom badge (e.g. FLASH SALE)..."
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                />
              </div>

              {/* Link URL (Optional) */}
              <div>
                <label className="text-xs font-bold text-[#171717] block mb-1">
                  Destination Link <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <div className="flex gap-1.5 mb-1.5">
                  {["/menu", "/menu?category=1", "/menu?category=2"].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setLinkUrl(preset)}
                      className="px-2 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E5E2D9] text-[10px] font-mono text-stone-600 hover:bg-stone-200 transition cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="/menu or /menu?category=1"
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                />
              </div>

              {/* Sort Order & Visibility Status */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-[#171717] block mb-1">
                    Display Order (#)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="text-xs font-bold text-[#171717] block mb-1.5">
                    Visibility
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer h-9 px-2 bg-[#FAF9F6] rounded-xl border border-[#E5E2D9]">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-[#12372A] focus:ring-[#12372A] cursor-pointer"
                    />
                    <span className="text-xs font-bold text-[#171717]">
                      Show in Slideshow
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-[#E5E2D9] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-[#E5E2D9] text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#12372A] to-[#1E4D3C] hover:from-[#0e2b21] hover:to-[#173e30] text-white text-xs font-black flex items-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer border border-[#C9A227]/30"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? "Update Banner" : "Create Banner"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
